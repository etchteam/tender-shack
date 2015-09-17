var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable('due_north', {
    id: { type: 'int', primaryKey: true },
    scrape_datetime: 'string',
    last_id: 'string'
  }, callback);
};

exports.down = function(db, callback) {
  db.dropTable('due_north', callback);
};
