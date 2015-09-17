var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable('london_tenders_checked', {
    id: { type: 'string', primaryKey: true }
  }, callback);
};

exports.down = function(db, callback) {
  db.dropTable('london_tenders_checked', callback);
};
