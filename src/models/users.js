const mongoose = require('mongoose');
const cluster = require('cluster');
const logger = require('winston');
const bcrypt = require('bcrypt');
const rbac = require('./rbac');
const {addCreatedAt, addUpdatedAt, addDeleted} = require('./hooks');

const PermissionSchema = mongoose.Schema({
  subject: {type: String, required: true},
  action: {type: String, required: true},
  displayName: {type: String}
});
PermissionSchema.index({subject: 1, action: 1}, {unique: true});
const Permission = mongoose.model('Permission', PermissionSchema);

const RoleSchema = mongoose.Schema({
  name: {type: String, required: true, index: true, unique: true},
  displayName: {type: String},
  permissions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Permission'}]
});
const Role = mongoose.model('Role', RoleSchema);

const UserSchema = mongoose.Schema({
  username: {type: String, required: true},
  password: {type: String},
  createdAt: {type: Date},
  updatedAt: {type: Date},
  roles: [{type: mongoose.Schema.Types.ObjectId, ref: 'Role'}],
  deleted: {type: Boolean}
});

UserSchema.index({username: 1}, {
  unique: true,
  partialFilterExpression: {
    deleted: false
  }
});

addCreatedAt(UserSchema);
addUpdatedAt(UserSchema);
addDeleted(UserSchema);

UserSchema.methods.checkPassword = async function (password) {
  if (!this.password)
    return false;
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.can = async function (action, subject) {
  const permission = (await Permission.findOne({action, subject}, {_id: 1}))._id;
  for (let roleId of this.roles) {
    const role = await Role.findById(roleId);
    for (let perm of role.permissions)
      if (perm.equals(permission))
        return true;
  }
  return false;
};

const User = mongoose.model('User', UserSchema);

function compareIdArray(arr1, arr2) {
  if (arr1.length !== arr2.length)
    return false;
  for (let i = 0; i < arr1.length; ++i)
    if (!arr1[i].equals(arr2[i]))
      return false;
  return true;
}

module.exports = async function (global) {
  if (cluster.isMaster || cluster.worker.id === 1) {
    await Promise.all(rbac.permissions.map(perm =>
      Permission.findOneAndUpdate(perm, perm, {upsert: true})
    ));
    await Promise.all(rbac.roles.map(async role => {
      const oldRole = await Role.findOne({name: role.name});
      role.permissions = await Promise.all(role.permissions.map(async x =>
        (await Permission.findOne({subject: x[1], action: x[0]}, {_id: 1}))._id
      ));
      if (!oldRole) {
        await Role.create(role);
        logger.verbose(`Add new role ${role.name}`);
      } else if (!compareIdArray(role.permissions, oldRole.permissions)) {
        oldRole.permissions = role.permissions;
        await oldRole.save();
        logger.verbose(`Update permissions for role ${role.name}`);
      }
    }));
    await Promise.all(rbac.users.map(async user => {
      const oldUser = await User.findOne({username: user.username});
      user.roles = await Promise.all(user.roles.map(
        async x => (await Role.findOne({name: x}, {_id: 1}))._id));
      if (!oldUser) {
        await User.create(user);
        logger.verbose(`Add new user ${user.username}`);
      } else if (!compareIdArray(user.roles, oldUser.roles)) {
        oldUser.roles = user.roles;
        await oldUser.save();
        logger.verbose(`Update roles for user ${user.username}`);
      }
    }));
  }
};

module.exports.Permission = Permission;
module.exports.Role = Role;
module.exports.User = User;
