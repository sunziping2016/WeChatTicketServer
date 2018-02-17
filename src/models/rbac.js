module.exports = {
  // 权限
  permissions: [
    {subject: 'Users', action: 'create'},
    {subject: 'Users', action: 'read'},
    {subject: 'Users', action: 'update'},
    {subject: 'Users', action: 'delete'}
  ],
  // 角色
  roles: [
    {
      name: 'user-admin',
      permissions: [
        ['create', 'Users'],
        ['read', 'Users'],
        ['update', 'Users'],
        ['delete', 'Users']
      ]
    }
  ],
  // 初始的用户，超级管理员
  // 请务必修改默认密码
  users: [
    {
      username: 'superuser',
      password: 'superuser',
      roles: ['user-admin']
    }
  ]
};
