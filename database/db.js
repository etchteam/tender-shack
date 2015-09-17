import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.load();

const pgp = pgPromise();

var cn = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tender-shack',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || ''
};

export default pgp(cn);