module.exports = {
  // 初始的权限
  permissions: [
    {subject: 'Role', action: 'create'},
    {subject: 'Role', action: 'read'},
    {subject: 'Role', action: 'update'},
    {subject: 'Role', action: 'delete'},
    {subject: 'User', action: 'create'},
    {subject: 'User', action: 'read'},
    {subject: 'User', action: 'update'},
    {subject: 'User', action: 'delete'}
  ],
  // 初始的角色
  roles: [
    {
      name: 'user-admin',
      permissions: [
        ['create', 'User'],
        ['read', 'User'],
        ['update', 'User'],
        ['delete', 'User']
      ]
    },
    {
      name: 'role-admin',
      permissions: [
        ['create', 'Role'],
        ['read', 'Role'],
        ['update', 'Role'],
        ['delete', 'Role']
      ]
    }
  ],
  // 初始的用户，超级管理员
  // 请务必修改默认密码
  users: [
    {
      username: 'superuser',
      password: 'superuser',
      roles: ['role-admin', 'user-admin']
    }
  ]
};
