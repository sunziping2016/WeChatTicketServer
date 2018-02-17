const mongoose = require('mongoose');
const cluster = require('cluster');
const logger = require('winston');
const bcrypt = require('bcrypt');
const rbac = require('./rbac');
const {addCreatedAt, addUpdatedAt, addDeleted, addFileFields} = require('./hooks');

function compareIdArray(arr1, arr2) {
  if (arr1.length !== arr2.length)
    return false;
  for (let i = 0; i < arr1.length; ++i)
    if (!arr1[i].equals(arr2[i]))
      return false;
  return true;
}

module.exports = async function (global) {
  const PermissionSchema = mongoose.Schema({
    subject: {type: String, required: true},
    action: {type: String, required: true},
    displayName: {type: String}
  });
  PermissionSchema.index({subject: 1, action: 1}, {unique: true});
  const Permissions = mongoose.model('Permissions', PermissionSchema);

  const RoleSchema = mongoose.Schema({
    name: {type: String, required: true, index: true, unique: true},
    displayName: {type: String},
    permissions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Permissions'}]
  });
  const Roles = mongoose.model('Roles', RoleSchema);

  const UserSchema = mongoose.Schema({
    username: {type: String, required: true},
    password: {type: String},
    email: {type: String},
    avatar: {type: String},
    avatarThumbnail64: {type: String},
    createdAt: {type: Date},
    updatedAt: {type: Date},
    roles: [{type: mongoose.Schema.Types.ObjectId, ref: 'Roles'}],
    blocked: {type: Boolean},
    deleted: {type: Boolean}
  });

  UserSchema.index({username: 1}, {
    unique: true,
    partialFilterExpression: {
      deleted: false
    }
  });

  UserSchema.index({email: 1}, {
    unique: true,
    partialFilterExpression: {
      deleted: false
    }
  });

  addCreatedAt(UserSchema);
  addUpdatedAt(UserSchema);
  addDeleted(UserSchema);
  addFileFields(UserSchema, ['avatar', 'avatarThumbnail64'], global.config['uploads-dir']);

  UserSchema.methods.setPassword = async function (password) {
    this.password = await bcrypt.hash(password, 10);
  };

  UserSchema.methods.checkPassword = async function (password) {
    if (!this.password)
      return false;
    return bcrypt.compare(password, this.password);
  };

  UserSchema.methods.can = async function (action, subject) {
    const target = await Permissions.findOne({action, subject}, {_id: 1});
    if (target === null)
      return false;
    const targetId = target._id;
    for (let roleId of this.roles) {
      const role = await Roles.findById(roleId);
      if (role === null)
        continue;
      for (let perm of role.permissions)
        if (perm.equals(targetId))
          return true;
    }
    return false;
  };

  const Users = mongoose.model('Users', UserSchema);

  if (cluster.isMaster || cluster.worker.id === 1) {
    await Promise.all(rbac.permissions.map(perm =>
      Permissions.findOneAndUpdate(perm, perm, {upsert: true})
    ));
    await Promise.all(rbac.roles.map(async role => {
      const oldRole = await Roles.findOne({name: role.name});
      role.permissions = await Promise.all(role.permissions.map(async x =>
        (await Permissions.findOne({subject: x[1], action: x[0]}, {_id: 1}))._id
      ));
      if (!oldRole) {
        await Roles.create(role);
        logger.verbose(`Add new role ${role.name}`);
      } else if (!compareIdArray(role.permissions, oldRole.permissions)) {
        oldRole.permissions = role.permissions;
        await oldRole.save();
        logger.verbose(`Update permissions for role ${role.name}`);
      }
    }));
    await Promise.all(rbac.users.map(async user => {
      const oldUser = await Users.findOne({username: user.username});
      user.roles = await Promise.all(user.roles.map(
        async x => (await Roles.findOne({name: x}, {_id: 1}))._id));
      if (!oldUser) {
        const password = user.password;
        delete user.password;
        const newUser = new Users(user);
        await newUser.setPassword(password);
        await newUser.save();
        logger.verbose(`Add new user ${user.username}`);
      } else if (!compareIdArray(user.roles, oldUser.roles)) {
        oldUser.roles = user.roles;
        await oldUser.save();
        logger.verbose(`Update roles for user ${user.username}`);
      }
    }));
    return {Permissions, Roles, Users};
  }
};
