import dotenv from 'dotenv';

import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import mongoose from 'mongoose';
import path from 'path';
import { uploadFileToR2 } from './utils/r2.js';
import Anthropic from '@anthropic-ai/sdk';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { CohereClient } from 'cohere-ai';

// Load environment variables
dotenv.config();

// Configure Fastify
const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyMultipart);

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

// Upload PDF

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

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

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
              text: "Please extract all the text content from this PDF document. Include all text, tables, and captions for images. Mark page breaks with '--- Page X ---' where X is the page number. Also identify any tables, charts, or diagrams and describe their content briefly. Don't add any extra text that is not in the document, such as 'Extracted Text Content from PDF Document'",
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
    });

    const embeddings = embedResponse.embeddings;

    return {
      r2Url: r2Url,
      extractedText: extractedText,
      chunks: chunks,
      embeddings: embeddings,
    };
  } catch (err) {
    console.log(err);
  }
});

// Query chat bot
