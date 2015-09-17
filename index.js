import dotenv from 'dotenv';
import express from 'express';
import sql from 'sql-bricks-postgres';
import pgPromise from 'pg-promise';

dotenv.load();

var pgp = pgPromise();
var app = express();

var cn = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tender-shack',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || ''
};

var db = pgp(cn);

app.get('/', function (req, res) {
  // Example query
  var query = sql.select().from('user').where({name: 'Bob'}).toString();

  db.query(query).then(function (data) {
    res.send(data);
  }, function (error) {
    res.send(error);
  }).done(function () {
    pgp.end();
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Server listening at http://%s:%s', host, port);
});
