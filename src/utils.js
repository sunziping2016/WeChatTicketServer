const chalk = require('chalk');
const logger = require('winston');
const STATUS_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green'
};

function promisify(func, settings) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      args.push((err, ...values) => {
        if (err)
          reject(err);
        else if (settings && settings.multiArgs)
          resolve(values);
        else
          resolve(values[0]);
      });
      func.apply((settings && settings.thisArg) || settings || this, args);
    });
  };
}

async function koaLogger(ctx, next) {
  const start = new Date();
  let status;
  try {
    await next();
    status = ctx.status;
  } catch (err) {
    status = err.status || 500;
    throw err;
  } finally {
    const duration = new Date() - start;
    let logLevel;
    if (status >= 500)
      logLevel = 'error';
    else if (status >= 400)
      logLevel = 'warn';
    else
      logLevel = 'info';
    const msg = chalk.gray(`${ctx.method} ${ctx.originalUrl}`) +
      chalk[STATUS_COLORS[logLevel]](` ${status} `) +
      chalk.gray(`${duration}ms`);
    logger.log(logLevel, msg);
  }
}

module.exports = {
  promisify,
  koaLogger
};
