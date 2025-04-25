import Fastify from 'fastify';

const fastify = Fastify({
  logger: true,
});

// Test route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' });
});

// Run server
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
