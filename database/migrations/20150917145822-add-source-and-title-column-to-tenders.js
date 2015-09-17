var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addColumn('tenders', 'tender_source', {type: 'string'}, callback);
  db.addColumn('tenders', 'title', {type: 'string'}, callback);
};

exports.down = function(db, callback) {
  db.removeColumn('tenders', 'tender_source', callback);
  db.removeColumn('tenders', 'title', callback);
};
