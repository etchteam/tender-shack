var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable('london_tenders', {
    id: { type: 'string', primaryKey: true, autoIncrement: true },
    scraped_at: 'datetime',
  }, callback);
};

exports.down = function(db, callback) {
  db.dropTable('london_tenders', callback);
};
