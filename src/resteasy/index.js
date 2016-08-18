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

const IGNORED_QUERIES = ['fields', 'order', 'limit', 'offset'];

function applySelect(query, ctx) {
  if (ctx.query.fields) {
    return query.select(ctx.query.fields.split(','));
  } else if (ctx._meta.fields) {
    return query.select(ctx._meta.fields.split(','));
  } else {
    return query.select('*');
  }
}

function queryFromSimpleParams(query, params) {
  _.each(params, function(value, key) {
    if (_.includes(IGNORED_QUERIES, key)) return;

    if (value.match(/^\-?[0-9.\-Ee]+$/))
      query = query.where(key, '=', Number(value));
    else
      query = query.where(key, 'ILIKE', value);
  });

  return query;
}

function applyWindow(query, ctx) {
  if (ctx.query.limit) {
    query = query.limit(Number(ctx.query.limit));
    ctx.resteasy.windowed = true;
  }

  if (ctx.query.offset) {
    query = query.offset(Number(ctx.query.offset));
    ctx.resteasy.windowed = true;
  }

  return query;
}

function applyOrder(query, ctx) {
  var order = ctx.query.order;
  if (order) {
    _.each(order.split(','), function(piece) {
      var m = piece.match(/^([+-]?)(.*?)$/);
      if (!m) return;

      var direction = ((m[1] == '-') ? 'desc' : 'asc');
      var column = m[2];

      query = query.orderBy(column, direction);
    });
  }

  return query;
}

function count(query, ctx) {
  return query.count('*');
}

// prepare the environment
router.use(function *(next) {
  this.knex = knex;
  this.resteasy = {};
  this.table = table(this);

  yield next;
});

function *index(next) {
  var query = this.knex(this.table);

  query = queryFromSimpleParams(query, this.query);

  if (this.query.limit || this.query.offset)
    this.resteasy.count = (yield count(query.clone(), this))[0].count;

  query = applyOrder(query, this);
  query = applyWindow(query, this);
  query = applySelect(query, this);

  sql = query.toSQL();
  res = yield query;

  this.body = { rows: res, query: sql.sql, bindings: sql.bindings, count: this.resteasy.count };
}

function *create(next) {
  var res = yield this.knex(this.table).insert(this.body).returning('*');

  this.body = res[0];
  this.response.status = 201; // 201 record created
}

function *read(next) {
  var query = this.knex(this.params.table).where('users.id', this.params.id);

  query = select(query, this);

  var result = yield;

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
