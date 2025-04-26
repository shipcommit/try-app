import dotenv from 'dotenv';

import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import mongoose from 'mongoose';
import path from 'path';
import { uploadFileToR2 } from './utils/r2.js';

// Configure Fastify
const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyMultipart);

// Load environment variables
dotenv.config();

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

    return {
      r2Url: r2Url,
    };
  } catch (err) {
    console.log(err);
  }

  // Extract text from PDF
  // Convert text to vector embeddings
});

// Query chat bot
