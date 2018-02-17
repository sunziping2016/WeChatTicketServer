const ajv = new (require('ajv'))();
const {errorsEnum, coreOkay, coreValidate, coreAssert} = require('./errors');

const authenticateSchema = ajv.compile({
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: {type: 'string'},
    password: {type: 'string'}
  },
  additionalProperties: false
});

async function authenticate(params, global) {
  const {jwt, users} = global;
  coreValidate(authenticateSchema, params.data);
  const password = params.data.password;
  delete params.data.password;
  const user = await users.findOne(params.data).notDeleted();
  coreAssert(user, errorsEnum.INVALID, 'User does not exist');
  coreAssert(await user.checkPassword(password), errorsEnum.INVALID, 'Wrong password');
  coreAssert(user.blocked !== true, errorsEnum.INVALID, 'User blocked');
  const token = await jwt.sign({uid: user._id.toString()}, {
    expiresIn: '10d'
  });
  return coreOkay({data: token});
}

module.exports = {
  authenticate
};
