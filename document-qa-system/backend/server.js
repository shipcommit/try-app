import Fastify from 'fastify';

const fastify = Fastify({
  logger: true,
});

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

// Run server
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
