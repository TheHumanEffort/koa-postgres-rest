var Router = require('koa-router');
var router = new Router();

var knex = require('knex')({ client: 'pg',
                             connection: {
                               host: 'postgres',
                               user: process.env.POSTGRES_ENV_POSTGRES_USER,
                               password: process.env.POSTGRES_ENV_POSTGRES_PASSWORD,
                               database: 'koa-rest-development',
                               port: '5432',
                             },
                           });

var _ = require('lodash');

// get and sanitize table:
function table(context) {
  return context.params.table.replace(/[^a-zA-Z_\-]/g, '');
}

function queryFromSimpleParams(query, params) {
  _.each(params, function(value, key) {
    query = query.where(key, 'ILIKE', value);
  });

  return query;
}

// prepare the environment
router.use(function *(next) {
  this.knex = knex;
  this.table = table(this);

  yield next;
});

function *index(next) {
  var query = this.knex(this.table).select('*');

  query = queryFromSimpleParams(query, this.query);

  res = yield query;
  this.body = { rows: res };
}

function *create(next) {
  var res = yield this.knex(this.table).insert(this.body).returning('*');

  this.body = res[0];
  this.response.status = 201; // 201 record created
}

function *read(next) {
  var result = yield this.knex(this.params.table).select('*').where('users.id', this.params.id);

  this.body = { rows: result };
}

function *update(next) {
  var res = yield this.knex(this.table).where('id', this.params.id).update(this.body, true).returning('*');
  this.body = res[0];
}

function *destroy(next) {
  var res = yield this.knex(this.table).where('id', this.params.id).del();
  this.body = { success: !!res };
}

router.post('/:table', create);
router.put('/:table/:id', update);
router.patch('/:table/:id', update);
router.get('/:table', index);
router.get('/:table/:id', read);
router.delete('/:table/:id', destroy);

module.exports = router.routes();
