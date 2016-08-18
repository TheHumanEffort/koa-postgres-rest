var app = require('koa')();
var body = require('koa-better-body');
var helmet = require('koa-helmet');
var pg = require('koa-pg');

var router = new require('koa-router')();

var resteasy = require('./resteasy');

var pgUser = process.env.POSTGRES_ENV_POSTGRES_USER;
var pgPass = process.env.POSTGRES_ENV_POSTGRES_PASSWORD;
var dbName = process.env.DATABASE_NAME + '-' + app.env;
var postgresUrl = (process.env.POSTGRES_URL || 'postgres://' + pgUser + ':' + pgPass + '@postgres:5432/' + dbName);

router.use('/api/v0', resteasy);

app.use(function *(next) {
  var start = new Date();
  yield next;
  var end = new Date();

  if (typeof this.body == 'object') {
    this.body.timing = { duration: end - start };
  }
});

app.use(require('koa-error')());
app.use(helmet()).use(body());

app.use(pg(postgresUrl));

app.use(router.routes());
app.use(router.allowedMethods());

console.log('Listenting on ' + (process.env.PORT || 3008));
app.listen(process.env.PORT || 3008);

