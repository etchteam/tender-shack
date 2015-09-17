import dueNorth from './scrapes/dueNorth';
import londonTenders from './scrapes/londonTenders';
import db from './database/db';

Promise.all([dueNorth(), londonTenders()])
    .then(process.exit)
    .catch(error => console.error(error, error.stack));