import request from 'request-promise';
import cheerio from 'cheerio';
import { parse } from 'query-string';
import sql from 'sql-bricks-postgres';
import db from '../database/db';

const lastScrapeId = null;

function scrapeIndex(response) {
    const $ = cheerio.load(response); 
    const linkEls = $('#opportunitiesGrid > tbody > tr > td:nth-child(1) > a');

    return linkEls.toArray().map((link) => {
        const href = $(link).attr('href');
        const query = parse(href.split('?')[1]);
        return {
            title: $(link).text(),
            id: query['advertId'],
            url: `https://procontract.due-north.com${href}`
        };
    });
}

function loadIndex(page = 1) {

    let url = 'https://procontract.due-north.com/Opportunities/Index';
    if (page > 1) {
        url += `?Page=${page}`;
    }

    return new Promise((resolve, reject) => {
        request(url)
            .then((response) => {
                resolve(scrapeIndex(response));
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function scrapedOnPage(ids) {
    const query = sql.select('last_id').from('due_north').where(sql.in('last_id', ids)).toString();
    return db.query(query);
}

function processPages() {
    return new Promise((resolve, reject) => {
        let allPages = [];
        let lastId = null;
        let pages;
        function check(i) {
            loadIndex(i)
                .then(currentPages => {
                    pages = currentPages;
                    const ids = pages.map(page => page.id);
                    if (!lastId) {
                        lastId = ids[0];
                    }
                    return scrapedOnPage(ids);
                })
                .then(results => {
                    if (results.length || i == 5) {
                        const ids = results.map(result => result.last_id);
                        let needed = true;
                        const neededPages = pages.reduce((memo, page) => {
                            if (!needed) return memo;
                            if (ids.indexOf(page.id) > -1) {
                                needed = false;
                            } else {
                                memo.push(page);
                            }
                            return memo;
                        }, []);
                        resolve({
                            lastId,
                            tenders: allPages.concat(neededPages)
                        });
                    } else {
                        allPages = allPages.concat(pages);
                        check(i + 1);
                    }
                })
                .catch(error => {
                    reject(error);
                });
        }
        check(1);
    });
}

function processTenders(results) {
    return new Promise((resolve, reject) => {
        const promises = results.tenders.map(tender => {
            return request(tender.url)
                .then(response => { 
                    return {
                        summary: tender,
                        response: response
                    }
                });
        });

        Promise.all(promises)
            .then(tenders => {
                resolve({
                    lastId: results.lastId,
                    tenders: filterTenders(tenders)
                });
            })
            .catch(error => reject(error));
    });
}

function scrapeTender(tender) {
    const mainSectionSelector = '#sticky-footer-helper > main > div > div.main-section';
    const $ = cheerio.load(tender.response); 
    const description = $(`${mainSectionSelector} > div:nth-child(1) > div > div:nth-child(4) > div.descriptionLess > div.cell400`).text();
    if (isOfInterest(tender.summary.title, description)) {
        return {
            title: tender.summary.title,
            link: tender.summary.url,
            description: description,
            value: $(`${mainSectionSelector} > div:nth-child(1) > div > div:nth-child(5) > div.cell400`).text(),
            contract_start_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(2)`).text(),
            contract_end_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(4)`).text(),
            submission_start_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div > div:nth-child(5) > div:nth-child(2)`).text(),
            submission_end_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div > div:nth-child(5) > div:nth-child(4)`).text(),
        }
    }
}

function isOfInterest(...fields) {
    return fields.filter(field => {
        return field.match(/(web|app|crm|cms|internet|hosting)/i);
    }).length > 0;
}

function filterTenders(tenders) {
    return tenders.map(scrapeTender).filter(tender => tender);
}

function saveData(data) {
    const promises = data.tenders.map(tender => saveTender(tender));
    return Promise.all(promises.concat(saveScrape(data.lastId)));
}

function saveScrape(lastId) {
    return new Promise((resolve, reject) => {
        const query = sql.insert('due_north', {scrape_datetime: new Date(), last_id: lastId}).toString();
        db.query(query)
            .then(resolve)
            .catch(reject);
    });
}

function saveTender(tender) {
    return new Promise((resolve, reject) => {
        const query = sql.insert('tenders', tender).toString();
        db.query(query)
            .then(resolve)
            .catch(reject);
    });   
}

export default function run() {
    return processPages()
        .then(processTenders)
        .then(saveData)
        .catch(console.error);
};