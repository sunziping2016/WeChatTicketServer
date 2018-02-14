const {startServer, stopServer} = require('./helper');

describe('Basic API test', () => {
  let request;

  before(async () => {
    request = await startServer();
  });
  after(async () => {
    await stopServer();
  });

  describe('when GET /api/foobar', () => {
    it('should return 404', () =>
      request
        .get('/')
        .expect(404)
        .expect('Content-Type', /text/)
    );
  });
});
