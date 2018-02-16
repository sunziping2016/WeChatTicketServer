const Users = require('./users.js');

module.exports = async function (global) {
  return {
    users: await Users(global)
  };
};
