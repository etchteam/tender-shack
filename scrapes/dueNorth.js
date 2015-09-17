import request from 'request-promise';
import cheerio from 'cheerio';
import { parse } from 'query-string';

const lastScrapeId = 'ba3db200-5d58-e511-80ef-000c29c9ba21';

function processIndex(response) {
    const $ = cheerio.load(response); 
    const linkEls = $('#opportunitiesGrid > tbody > tr > td:nth-child(1) > a');

    return linkEls.toArray().map((link) => {
        const href = $(link).attr('href');
        const query = parse(href.split('?')[1]);
        return {
            title: $(link).text(),
            id: query['advertId'],
            link: `https://procontract.due-north.com${href}`
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
                resolve(processIndex(response));
            })
            .catch((error) => {
                reject(error);
            });
    });
}

function processPages() {
    return new Promise((resolve, reject) => {
        let allPages = [];
        function check(i) {
            loadIndex(i)
                .then(pages => {
                    const ids = pages.map(page => page.id)
                    if (ids.indexOf(lastScrapeId) > -1 || i == 5) {
                        let needed = true;
                        neededPages = pages.reduce(memo, page => {
                            if (!needed) return;
                            if (page.id == lastScrapeId) {
                                needed = false;
                            } else {
                                memo.push(page);
                            }
                            return memo;
                        }, []);
                        resolve(allPages.concat(pages));
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


export default function run() {
    processPages()
        .then(console.dir)
        .catch(console.error);
};