var dbm = global.dbm || require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable('tenders', {
    id: { type: 'int', primaryKey: true },
    link: 'string',
    tender_id: 'string',
    description: 'string',
    value: 'string',
    submission_start_datetime: 'string',
    submission_end_datetime: 'string',
    contract_start_datetime: 'string',
    contract_end_datetime: 'string'
  }, callback);
};

exports.down = function(db, callback) {
  db.dropTable('tenders', callback);
};
