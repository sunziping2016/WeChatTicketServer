const path = require('path');
const logger = require('winston');
const server = new (require('../src/server'))();

const config = require(process.env.CONFIG_FILE
  ? path.join(__dirname, '../config', process.env.CONFIG_FILE)
  : '../config/config.test.json');

logger.level = 'error';

async function startServer() {
  await server.start(config);
  return require('supertest')(server.app.context.global.server);
}

function stopServer() {
  server.stop();
}

module.exports = {
  server,
  startServer,
  stopServer
};
