const http = require('http');
const Koa = require('koa');
const mongoose = require('mongoose');
const Redis = require('redis');
const Sio = require('socket.io');
const SioRedis = require('socket.io-redis');
const mailer = require('nodemailer');
const qs = require('koa-qs');
const Router = require('koa-router');
const serve = require('koa-static');
const mount = require('koa-mount');
const redisCommands = require('redis-commands');
const {promisify, koaLogger} = require('./utils');

redisCommands.list.forEach(key =>
  Redis.RedisClient.prototype[key + 'Async'] = promisify(Redis.RedisClient.prototype[key])
);
['exec', 'exec_atomic'].forEach(key =>
  Redis.Multi.prototype[key + 'Async'] = promisify(Redis.Multi.prototype[key])
);

/**
 * 整个服务端类。这里初始化了整个项目传递各种对象的`global`对象。
 *
 * `global`对象包含以下几个字段：
 * 1. `config`：项目的配置
 * 2. `db`、`redis`：Mongoose链接和Redis链接
 * 3. `sio`：Socket.IO对象
 * 4. `email`：nodemailer对象
 *
 * 对于Koa的中间件来讲，这个对象可通过`ctx.global`获得。
 */
class Server {
  /**
   * 启动服务端，初始化所有model和路由等等。
   *
   * @param config {object} 项目配置，参见`example.config.json`
   * @returns {Promise.<void>} 监听成功后resolve，否则reject
   */
  async start(config) {
    /* ==== 初始化上下文环境 ==== */
    config = Server.normalizeConfig(config || {});
    const app = this.app = new Koa();
    app.proxy = true;
    mongoose.connect(config.db);
    const redis = Redis.createClient(config.redis);
    const sioRedis = Redis.createClient(config.redis);
    const server = http.createServer(app.callback());
    const sio = Sio(server);
    sio.adapter(SioRedis({
      pubClient: redis,
      subClient: sioRedis
    }));
    const global = {
      config,              // 配置选项
      redis,               // Redis数据库的连接
      sioRedis,            // Redis数据库的连接，专门用于Socket.IO的监听事件
      server,              // HTTP server实例
      sio                  // Socket.IO服务端
    };
    if (config.email)
      global.email = mailer.createTransport(config.email); // E-mail邮件传输
    app.context.global = global;
    /* ==== 设置路由 ==== */
    qs(app);
    app.use(koaLogger);
    const router = new Router();
    app.use(router.routes(), router.allowedMethods());
    app.use(mount('/uploads', serve('uploads')));
    app.use(serve('public'));
    if (config.port !== undefined)
      await new Promise((resolve, reject) =>
        server
          .listen(config.port, config.host, resolve)
          .once('error', reject)
      );
  }

  static normalizeConfig(config) {
    const defaultConfig = {
      name: 'Crowd Sourcing',
      host: 'localhost',
      db: 'mongodb://localhost/wechatTicket',
      redis: 'redis://localhost/',
      'upload-dir': 'uploads',
      'task-template-dir': './task-templates',
      'temp-dir': 'temp',
      'static': false
    };
    Object.assign(defaultConfig, config);
    if (defaultConfig.site === undefined)
      defaultConfig.site = `http://${defaultConfig.host}:${defaultConfig.port}`;
    return defaultConfig;
  }

  /**
   * 停止服务器，停止完毕后可以再调用调用`start()`
   *
   * @returns {Promise.<void>} 完成后resolve，否则reject
   */
  async stop() {
    const {redis, sioRedis, server, sio} = this.app.context.global;
    redis.quit();
    sioRedis.quit();
    await Promise.all([
      new Promise((resolve, reject) => server.close(resolve)),
      new Promise((resolve, reject) => sio.close(resolve)),
      mongoose.disconnect()
    ]);
  }
}

module.exports = Server;
