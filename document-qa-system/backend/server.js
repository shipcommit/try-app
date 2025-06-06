import dotenv from 'dotenv';

import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import mongoose from 'mongoose';
import path from 'path';
import { uploadFileToR2 } from './utils/r2.js';
import Anthropic from '@anthropic-ai/sdk';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { CohereClient } from 'cohere-ai';

import Document from './models/Document.js';
import DocumentVectors from './models/DocumentVectors.js';

// Load environment variables
dotenv.config();

// Configure Fastify
const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyMultipart);

// Configure Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configure Cohere
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    await connectToMongoDB();

    fastify.listen({ port: 3000 }, function (err) {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();

// Test route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' });
});

// Add data
fastify.post('/add-data', async (request, reply) => {
  // Upload file to R2
  try {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file to upload' });
    }

    // Check file extension
    const fileExtension = path.extname(data.filename).toLowerCase();

    if (fileExtension !== '.pdf') {
      return reply.code(400).send({ error: 'Only PDF files are supported' });
    }

    // Get file buffer
    const fileBuffer = await data.toBuffer();

    // Upload file to R2
    const r2Result = await uploadFileToR2(fileBuffer, data.filename);
    const r2Url = `${process.env.CLOUDFLARE_R2_SUBDOMAIN}/${r2Result.filename}`;

    // Convert buffer to base64
    const base64PDF = fileBuffer.toString('base64');

    // Extract text and structure from the PDF
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: "Please extract all the text content from this PDF document. Include all text, tables, and captions for images. Mark page breaks with '--- Beginning of page X ---' and '--- End of page X ---' where X is the page number. Also identify any tables, charts, or diagrams and describe their content briefly. Don't add any extra text that is not in the document, such as 'Extracted Text Content from PDF Document'",
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64PDF,
              },
            },
          ],
        },
      ],
    });

    const extractedText = response.content[0].text;

    // Split article text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.createDocuments([extractedText]);

    // Create vector embeddings of each text chunk with Cohere
    const chunkTexts = chunks.map((chunk) => chunk.pageContent);

    const embedResponse = await cohere.embed({
      texts: chunkTexts,
      model: 'embed-english-v3.0',
      input_type: 'search_document',
      output_dimension: 1024,
    });

    const embeddings = embedResponse.embeddings;

    // Create new article document
    const article = new Document({
      url: r2Url,
      filename: data.filename,
      text: extractedText,
    });

    // Save article to database
    await article.save();

    // Create and save DocumentVectors documents with embeddings for each chunk
    const articleVectorsPromises = chunkTexts.map((chunk, index) => {
      const articleVector = new DocumentVectors({
        documentId: article._id.toString(),
        filename: data.filename,
        textChunk: chunk,
        embeddings: embeddings[index],
      });
      return articleVector.save();
    });

    // Wait for all DocumentVectors documents to be saved
    await Promise.all(articleVectorsPromises);

    return reply.code(201).send({
      success: true,
      message: 'Document uploaded and processed successfully',
      article: article,
    });
  } catch (err) {
    console.log(err);
    return reply.code(500).send({
      success: false,
      error: 'Error processing document',
      details: err.message,
    });
  }
});

// Get all documents
fastify.get('/documents', async (request, reply) => {
  try {
    const documents = await Document.find({})
      .select('_id url filename createdAt')
      .sort({ createdAt: -1 });

    return reply.code(200).send(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return reply.code(500).send({
      success: false,
      error: 'Error fetching documents',
      details: error.message,
    });
  }
});

// Delete document and its vectors
fastify.delete('/document/:documentId', async (request, reply) => {
  try {
    const { documentId } = request.params;

    if (!documentId) {
      return reply.code(400).send({
        success: false,
        error: 'Document ID is required',
      });
    }

    // Delete the document
    const deletedDocument = await Document.findByIdAndDelete(documentId);

    if (!deletedDocument) {
      return reply.code(404).send({
        success: false,
        error: 'Document not found',
      });
    }

    // Delete all associated vector embeddings
    const deletedVectors = await DocumentVectors.deleteMany({
      documentId: documentId,
    });

    return reply.code(200).send({
      success: true,
      message: 'Document and associated vectors deleted successfully',
      document: deletedDocument,
      vectorsDeleted: deletedVectors.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return reply.code(500).send({
      success: false,
      error: 'Error deleting document',
      details: error.message,
    });
  }
});

// Query chat bot
fastify.post('/query-rag', async (request, reply) => {
  try {
    const queryText = request.body.query;
    const similarityThreshold = 0.67;

    // Generate vector embeddings for the query
    const queryEmbedResponse = await cohere.embed({
      texts: [queryText],
      model: 'embed-english-v3.0',
      input_type: 'search_query',
      output_dimension: 1024,
    });

    const queryEmbeddings = queryEmbedResponse.embeddings[0];

    // Find articles with similar embeddings
    const similarChunks = await DocumentVectors.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          queryVector: queryEmbeddings,
          path: 'embeddings',
          numCandidates: 100,
          limit: 10,
        },
      },
      {
        $project: {
          filename: 1,
          chunk: '$textChunk',
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $match: {
          score: { $gte: similarityThreshold },
        },
      },
      {
        $limit: 5,
      },
    ]);

    // Determine response based on vector search
    let answer = '';
    const filenamesArray = [];
    let chunks = similarChunks.map((chunk) => chunk.chunk).join('\n\n');

    console.log('chunks:', chunks);

    if (similarChunks.length < 1) {
      answer = 'Looks like there are no matching documents in the database.';
    }

    // Add each filename to an array and filter out duplicates
    else {
      similarChunks.forEach((chunk) => {
        if (!filenamesArray.includes(chunk.filename)) {
          filenamesArray.push(chunk.filename);
        }
      });
    }

    console.log('filenamesArray:', filenamesArray);

    // Make request to LLM
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      system:
        'Provide a short and simple answer based on the user question. You can use the "Database data" if necessary to answer the user question. Please answer in the langue of the user, if the user uses a language other than English.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Database data: ${chunks}`,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `User question: ${queryText}`,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Names of file(s) found: ${filenamesArray
                .map((filename) => filename)
                .join('')}
              The user already has a list of the filename(s), there is no need to list them again.`,
            },
          ],
        },
      ],
    });

    if (filenamesArray.length < 1) {
      answer = 'There is no document matching your question.';
    } else {
      answer = response.content[0].text;
    }

    return reply.code(200).send({
      success: true,
      response: answer,
      results: similarChunks,
      citations: filenamesArray,
    });
  } catch (err) {
    console.log(err);
    return reply.code(500).send({
      success: false,
      error: 'Error processing query',
      details: err.message,
    });
  }
});
