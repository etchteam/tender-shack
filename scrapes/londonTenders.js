import request from 'request-promise';
import cheerio from 'cheerio';
import { parse } from 'query-string';
import sql from 'sql-bricks-postgres';
import db from '../database/db';
import isOfInterest from '../scraping/ofInterest';

function scrapeIndex(response) {
    const $ = cheerio.load(response); 
    const linkEls = $('.plannerSearch table td a');

    return linkEls.toArray().map((link) => {
        const href = $(link).attr('href');
        const query = parse(href.split('?')[1]);
        return {
            title: $(link).text(),
            id: query['opp_id'],
            url: `https://www.londontenders.org${href}`
        };
    });
}

function scrapedOnPage(ids) {
    const query = sql.select('id').from('london_tenders_checked').where(sql.in('id', ids)).toString();
    return db.query(query);
}

function processIndex() {
    const url = 'https://www.londontenders.org/procontract/supplier.nsf/frm_planner_search_results?OpenForm&contains=&cats=&order_by=DATE&all_opps=&org_id=ALL';
    return new Promise((resolve, reject) => {
        request(url)
            .then(response => resolve(scrapeIndex(response)))
            .catch(reject);
    });
}

function processTenders(results) {
    const ids = results.map(result => result.id);
    return new Promise((resolve, reject) => {
        scrapedOnPage(ids)
            .then(processTendersFromExisting.bind(this, resolve, reject, results))
            .catch(reject);
    });
}

function processTendersFromExisting(resolve, reject, results, existing) {
    const existingIds = existing.map(item => item.id);
    const newTenders = results.filter(result => existingIds.indexOf(result.id) == -1);

    if (!newTenders.length) {
        resolve({
            ids: [],
            tenders: []
        });
    } else {
        const promises = newTenders.map(tender => {
            return request(tender.url)
                .then(response => { 
                    return {
                        summary: tender,
                        response: response
                    };
                });
        });
        
        Promise.all(promises)
            .then(tenders => {
                resolve({
                    ids: newTenders.map(item => item.id),
                    tenders: filterTenders(tenders)
                });
            })
            .catch(reject);
    }
}

function filterTenders(tenders) {
    return tenders.map(scrapeTender).filter(tender => tender);
}

function scrapeTender(tender) {
    const mainSectionSelector = '#columnlayout > div.twocolumnlayoutCOL1';
    const $ = cheerio.load(tender.response); 
    const description = $(`${mainSectionSelector} > div.sectionBody > dl > dd.synopsis`).text();
    if (isOfInterest(tender.summary.title, description)) {
        return {
            title: tender.summary.title,
            link: tender.summary.url,
            description: description,
            contract_start_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div.sectionBody > dl > dd:nth-child(2)`).text(),
            contract_end_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div.sectionBody > dl > dd:nth-child(4)`).text(),
            submission_start_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div.sectionBody > dl > dd:nth-child(6)`).text(),
            submission_end_datetime: $(`${mainSectionSelector} > div:nth-child(2) > div.sectionBody > dl > dd:nth-child(8)`).text(),
        };
    }
}

function saveTenders(tenders) {
    if (tenders.length) { 
        const query = sql.insert('tenders', tenders).toString();
        return db.query(query);
    } else {
        return Promise.resolve();
    }
}

function saveIds(ids) {
    if (ids.length) {     
        const idData = ids.map(id => { 
            return { id, date: new Date() };
        });
        const query = sql.insert('london_tenders_checked', idData).toString();
        return db.query(query);
    } else {
        return Promise.resolve();
    }
}

function saveScrape() {
    const query = sql.insert('london_tenders', { scraped_at: new Date() }).toString();
    return db.query(query);   
}


function saveData(data) {
    return Promise.all([saveTenders(data.tenders), saveIds(data.ids), saveScrape()])
        .then(() => data.tenders);
}

export default function run() {
    return processIndex()
        .then(processTenders)
        .then(saveData)
        .then((tenders) => console.log(`${tenders.length} London Tenders added`));
};