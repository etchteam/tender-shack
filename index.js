import dotenv from 'dotenv';
import express from 'express';
import sql from 'sql-bricks-postgres';
import pgPromise from 'pg-promise';
import livereload from 'express-livereload';
import nl2br from 'nl2br';

dotenv.load();

var pgp = pgPromise();
var app = express();

app.set('view engine', 'jade');

livereload(app, {});

var cn = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tender-shack',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || ''
};

var db = pgp(cn);

app.get('/', function (req, res) {
  var query = sql.select().from('tenders').toString();

  db.query(query).then(function (data) {
    res.render('index', { title: 'Tender Shack', tenders: data});
  }, function (error) {
    res.render('error', { title: 'Ut-oh! Something went wrong :(', error: error});
  }).done(function () {
    pgp.end();
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Server listening at http://%s:%s', host, port);
});
