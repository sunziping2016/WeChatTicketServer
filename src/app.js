/**
 *
 * 以下是程序的帮助输出可以通过`node src/app -h`获得。程序的配置文件可以参照`config.example.json`。
 *
 * ```
 * Usage: app [options] [port] [host]
 *
 * Options:
 *
 * -V, --version        output the version number
 * -c, --config <file>  config file to load (default: ../config/config.json)
 * -j, --cluster [num]  whether to use cluster
 * -v, --verbose        show verbose information
 * -s, --static         serve static file
 * -h, --help           output usage information```
 *
 * 如果`cluster`没有指定，则默认是CPU个数。目前我们的分布式方案中没有采用sticky session，
 * 其主要原因是带来了额外的性能开销，这也意味着Socket.IO必须采用WebSocket，禁止long polling。
 *
 * 总的而言，我们认为应该是反向代理负责sticky session。尽可能干净地断开所有链接。
 *
 * @module app
 */

const logger = require('winston');
const cluster = require('cluster');
const program = require('commander');

let port, host;

program
  .version('0.0.1')
  .arguments('[port] [host]')
  .action((p, h) => {
    port = parseInt(p);
    host = h;
  })
  .option('-c, --config <file>', 'config file to load', process.env.CONFIG_FILE || '../config/config.json')
  .option('-j, --cluster [num]', 'whether to use cluster', parseInt)
  .option('-v, --verbose', 'show verbose information')
  .option('-s, --static', 'serve static file')
  .parse(process.argv);

const config = {
  host: 'localhost',
  port: 8000,
  db: 'mongodb://localhost/wechatTicket',
  redis: 'redis://localhost/',
  'uploads-dir': 'uploads',
  'log-level': 'info'
};
if (program.config !== undefined)
  Object.assign(config, require(program.config));
if (port !== undefined)
  config.port = port;
if (host !== undefined)
  config.host = host;
if (program.cluster !== undefined && !isNaN(program.cluster))
  config.cluster = program.cluster;
if (program.verbose)
  config['log-level'] = 'verbose';

if (config.cluster === true)
  config.cluster = require('os').cpus().length;

const logLabel = (config.cluster ? (cluster.isMaster ? 'Master' : 'Worker')
  : 'Main') + ' ' + process.pid;
const logTransports = [
  new (logger.transports.Console)({
    level: config['log-level'],
    colorize: true,
    label: logLabel
  })
];
if (config['log-file'])
  logTransports.push(new (logger.transports.File)({
    level: config['log-level'],
    filename: config['log-file']
  }));
logger.configure({transports: logTransports});

if (config.cluster) {
  if (cluster.isMaster) {
    logger.info(`Master starts at http://${config.host}:${config.port}`);
    for (let i = 0; i < config.cluster; ++i)
      cluster.fork();

    let confirmed = false;
    cluster.on('exit', (worker, code) => {
      if (!worker.exitedAfterDisconnect)
        logger.error(`Worker ${worker.process.pid} exited accidentally with code ${code}`);
    });

    process.on('SIGINT', () => {
      if (confirmed) {
        logger.warn('Received SIGINT again. Force stop!');
        process.exit(1);
      } else {
        logger.info('Received SIGINT. Press CTRL-C again in 5s to force stop.');
        confirmed = true;
        setTimeout(() => confirmed = false, 5000).unref();
      }
    });
  } else if (cluster.isWorker) {
    const server = new (require('./server'))();
    server.start(config)
      .then(() => logger.info('Worker starts'))
      .catch(err => {
        logger.error('Error when starting worker');
        logger.error(err);
        server.stop();
      });

    process.on('SIGINT', () => {
      cluster.worker.disconnect();
      server.stop()
        .then(() => {
          logger.info('Worker stops');
          process.exit();
        })
        .catch(err => {
          logger.error('Error when stopping worker');
          logger.error(err);
        });
    });
  }
} else {
  const server = new (require('./server'))();
  server.start(config)
    .then(() => logger.info(`Server starts at http://${config.host}:${config.port}`))
    .catch(err => {
      logger.error('Error when starting server');
      logger.error(err);
      server.stop();
    });

  let confirmed = false;
  process.on('SIGINT', () => {
    if (confirmed) {
      logger.warn('Received SIGINT again. Force stop!');
      process.exit(1);
    } else {
      logger.info('Received SIGINT. Press CTRL-C again in 5s to force stop.');
      confirmed = true;
      setTimeout(() => confirmed = false, 5000).unref();
      server.stop()
        .then(() => logger.info('Server stops'))
        .catch(err => {
          logger.error('Error when stopping server');
          logger.error(err);
        });
    }
  });
}
