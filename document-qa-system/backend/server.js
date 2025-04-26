import Fastify from 'fastify';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Initialize MongoDB client
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoClient.connect();
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
fastify.post('/add-data', function (request, reply) {
  // Extract text from PDF
  // Convert text to vector embeddings
});

// Query chat bot
