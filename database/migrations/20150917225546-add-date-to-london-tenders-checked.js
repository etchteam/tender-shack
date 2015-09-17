var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
    db.addColumn('london_tenders_checked', 'date', { type: 'datetime' }, callback);
};

exports.down = function(db, callback) {
    db.removeColumn('london_tenders_checked', 'date', callback);
};
