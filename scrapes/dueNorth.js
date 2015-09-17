import request from 'request-promise';
import cheerio from 'cheerio';
import { parse } from 'query-string';

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

function processPages() {
    return new Promise((resolve, reject) => {
        let allPages = [];
        let lastId = null;
        function check(i) {
            loadIndex(i)
                .then(pages => {
                    const ids = pages.map(page => page.id);
                    if (!lastId) {
                        lastId = ids[0];
                    }
                    if (ids.indexOf(lastScrapeId) > -1 || i == 5) {
                        let needed = true;
                        const neededPages = pages.reduce((memo, page) => {
                            if (!needed) return memo;
                            if (page.id == lastScrapeId) {
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
            url: tender.summary.url,
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
    console.dir(data);
}

export default function run() {
    processPages()
        .then(processTenders)
        .then(saveData)
        .catch(console.error);
};