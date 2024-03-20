const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const process = require('process');
const EventEmitter = require('events');
const path = require('path');

const { readFile, getCurrentDateTime } = require('./utils');
const { logger } = require('./logger');

const urlRegex = /https?:\/\/\S+/gi;
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

class YoutubeParser extends EventEmitter {
    constructor(searchReqs, incorrectUrls, parseType, subscribers, views) {
        super();

        this.browser = null;

        this.host = 'https://www.youtube.com';

        this.searchReqs = searchReqs;
        // this.correctKeywords = correctKeywords;
        this.incorrectUrls = incorrectUrls;
        this.parseType = parseType;
        this.subscribers = subscribers;
        this.views = views;
    }

    /**
     * @param {import('puppeteer').Browser} browser
     */
    async parse() {
        const page = await this.browser.newPage();
    
        await page.setRequestInterception(true);
        await page.setDefaultNavigationTimeout(1000 * 60);
    
        page.on('request', (req) => {
            if (req.resourceType() === 'image' || req.resourceType() === 'video' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            await this.acceptCookie(page);
        } catch (e) {
            
        }

        let videoUrls = await this.getVideoUrls(page);

        let result = [];
        for (var i = 0; i < videoUrls.length; i++) {
            this.emit('output', `Parsing ${i + 1} of ${videoUrls.length}. URL: ${videoUrls[i]}`);

            try {
                let videoResult = await this.parseOne(page, videoUrls[i]);
                if (videoResult) result.push(videoResult);
            } catch (e) {
                this.emit('error', "Error: " + e + `\nSkip URL: ${videoUrls[i]}`);
            }

        };

        return result;
    }

    async parseOne(page, url) {
        let videoResult = [];

        await page.goto(url);

        await page.waitForSelector('tp-yt-paper-button#expand-sizer', {timeout: 60 * 1000});
        await page.click('tp-yt-paper-button#expand-sizer');
        await page.waitForTimeout(2000);

        const description = await page.$('#description-inline-expander yt-attributed-string');
        const text = (await page.evaluate(element => element.innerText, description)).toLowerCase();

        // let isValid = await this.filterKeywords(text);
        let foundedUrls = text.match(urlRegex);
        let foundedEmails = text.match(emailRegex);

        if (foundedEmails || foundedUrls) {
            videoResult.videoUrl = url;

            if (foundedUrls) {
                foundedUrls = await this.filterUrls(foundedUrls);
                videoResult.urls = foundedUrls.join(',');
            } else {
                videoResult.urls = '';
            }
            
            if (foundedEmails) {
                videoResult.emails = foundedEmails.join(',');
            } else {
                videoResult.emails = '';
            }
        } else {
            return null;
        }

        return videoResult;
    }

    async filterUrls(urls) {
        return urls.filter(url => {
            let isValid = true;

            for (let i = 0; i < this.incorrectUrls.length; i++) {
                if (this.incorrectUrls[i] && url.includes(this.incorrectUrls[i])) {
                    isValid = false;
                    break;
                }
            }

            return isValid;
        });
    }

    // async filterKeywords(text) {
    //     let isValid = true;
    //     for (let i = 0; i < this.correctKeywords.length; i++) {
    //         if (this.correctKeywords[i] != '' && text.includes(this.correctKeywords[i])) {
    //             isValid = false;
    //             return;
    //         }
    //     }
    //     return isValid;
    // }

    /**
     * @param {import('puppeteer').Page} page
     * @returns {Array}
     */
    async getVideoUrls(page) {
        let urls = [];
        for (let i = 0; i < this.searchReqs.length; i++) {
            this.emit(`Parsing ${this.searchReqs[i]}`);

            await page.goto(this.host + `/results?search_query=${this.searchReqs[i]}&sp=${this.mode}`);
            await page.waitForTimeout(2000);

            await this.autoScroll(page);

            let queryUrls = await Promise.all((await page.$x('//ytd-video-renderer/div/ytd-thumbnail/a')).map(async element => {
                return this.host + (await element.evaluate(element => element.getAttribute('href')));
            }));
            urls = [...urls, ...queryUrls]
        };

        return urls;
    }

    /**
     * @param {import('puppeteer').Page} page
     */
    async acceptCookie(page) {
        await page.goto(this.host);
        await page.waitForTimeout(2000);

        const [button] = await page.$x("(//button[contains(@class, 'yt-spec-button-shape-next yt-spec-button-shape-next--filled')])[last()]");
        button.click();
        await page.waitForTimeout(2000);
    }

    async autoScroll(page) {
        let prevHeight = -1;
        let maxScrolls = 100;
        let scrollCount = 0;
        let newHeight = 5000;

        while (scrollCount < maxScrolls) {
            // Scroll to the bottom of the page
            await page.evaluate(`window.scrollTo(0, ${newHeight});`);
            // Wait for page load
            await page.waitForTimeout(1000);
            // Calculate new scroll height and compare
            newHeight += 5000;
            if (newHeight == prevHeight) {
                break;
            }
            prevHeight = newHeight;
            scrollCount += 1;
        }
    }

    async getMode() {
        const table = {
            "week": "EgQIAxAB",
            "month": "EgQIBBAB",
            "year": "EgQIBRAB",
            "all": "EgIQAQ%253D%253D"
        };

        return table[process.env.PARSE_TYPE];
    }

    async saveResult(filepath, data) {
        const csvWriter = createCsvWriter({
            path: filepath,
            header: [
                {id: 'videoUrl', title: 'VIDEO_URL'},
                {id: 'urls', title: 'URLS'},
                {id: 'emails', title: 'EMAILS'}
            ],
            separator: ';'
        });
    
        await csvWriter.writeRecords(data);
            
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async start() {
        var filepath;

        puppeteer.use(StealthPlugin());
        this.mode = await this.getMode();

        try {
            this.browser = await puppeteer.launch({ 
                args: ['--no-sandbox'], 
                headless: (() => {
                    if (process.env.HEADLESS === 'True') {
                        return 'new';
                    } else {
                        return false;
                    }
                })(), 
                executablePath: executablePath() 
            });

            this.emit('output', "=== START PARSING ===");
            
            try {
                var result = await this.parse();
            } catch (e) {
                this.emit('error', e);
                return;
            }
            try {
                filepath = path.join(__dirname, 'data', getCurrentDateTime() + '.csv')
                this.saveResult(filepath, result);
            } catch (e) {
                this.emit('error', e);
                return;
            }
            this.emit('output', "=== END PARSING ===");
        } catch (error) {
            this.emit('error', error);
        } finally {
            await this.close();
        }
        return filepath;
    }
}


function main() {
    require("dotenv").config();

    const searchReqs = readFile(process.env.SEARCH_REQUESTS_PATH).split('\n');
    // const correctKeywords = readFile(process.env.CORRECT_KEYWORDS_PATH).split('\n');
    const incorrectUrls = readFile('./exstensionUrls.txt').split('\n');

    const parser = new YoutubeParser(searchReqs, incorrectUrls, 'all', 1, 2);

    parser.on('output', (output) => {
        console.log(output);
    });

    parser.on('error', (output) => {
        logger.error(output);
        console.error(output);
    });

    parser.start();
}


if (require.main === module) {
    main();
}

module.exports = YoutubeParser;
