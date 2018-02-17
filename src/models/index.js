module.exports = async function (global) {
  const {Permissions, Roles, Users} = await require('./users.js')(global);
  return {
    permissions: Permissions,
    roles: Roles,
    users: Users,
    jwt: await require('./jwt')(global)
  };
};
