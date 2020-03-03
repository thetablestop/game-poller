import axios from 'axios';
import url from 'url';
import chalk from 'chalk';
import robotsParser from 'robots-txt-parser';
import ip from 'ip';
import moment from 'moment';

export class GameParseService {
    constructor({ gameService, gameSourcesService, pubSubQueueProvider }) {
        this.paused = false;
        this.gameService = gameService;
        this.gameSourceService = gameSourcesService;
        this.queue = pubSubQueueProvider;
        this.gamesQueueName = process.env.GAMES_QUEUE || 'games';
        const host = process.env.HTML_SCRAPER_SERVICE_HOST || 'localhost';
        const port = process.env.HTML_SCRAPER_SERVICE_PORT || 3002;
        this.scraperBaseUrl = `http://${host}:${port}/api/`;
        this.robots = robotsParser({
            userAgent: 'Googlebot',
            allowOnNeutral: false
        });
    }

    async parse() {
        const sites = await this.gameSourceService.getAll();
        for (const s of sites) {
            if (!this.paused) {
                console.log(`Parsing site with url: ${s.url} and link selector: ${s.linkSelector}`);
                try {
                    await this._parseSite(s.name, s.currentPage || null);
                } catch (err) {
                    console.error(`Error parsing site '${s.name}'`, err);
                }
            }
        }
    }

    async _parseSite(siteName, page = null) {
        const site = await this.gameSourceService.find(siteName);

        try {
            this.gameSourceService.updatePage(site.name, page);

            // Get all the links
            const response = await this._scrapeLinks(site, page, site.linkSelector);
            for (const a of response.data) {
                console.log(`Found link: ${a.content} (${a.link})`);
                let entity;
                try {
                    await this.gameService.upsert(a.content, site.name, a.link);
                    entity = await this.gameService.find(a.content);
                } catch (err) {
                    console.error(chalk.red(`Error updating DB record for ${a.content}`));
                }

                try {
                    if (entity) {
                        const ch = await this.queue.connect();
                        const hasQ = await ch.assertQueue(this.gamesQueueName);
                        if (hasQ) {
                            console.log(`Sending to queue: ${entity.name}`);
                            ch.sendToQueue(this.gamesQueueName, Buffer.from(JSON.stringify(entity)));
                        }
                    }
                } catch (err) {
                    console.error(chalk.red(`Error sending to queue for ${entity.name}`));
                }
            }
        } catch (err) {
            console.error(`Error parsing page ${page} for '${site.name}'. Retrying in 5 seconds...`, err);
            setTimeout(() => this._parseSite(siteName, page), 5000);
        }

        // Get the next page link and parse if exists
        try {
            const nextPageResponse = await this._scrapeLinks(site, page, site.nextPageSelector);
            if (nextPageResponse.data && !!nextPageResponse.data.length) {
                const nextPage = nextPageResponse.data[0].link;
                if (this.paused) {
                    console.log(`Poller for ${site.name} paused. Next run will start on ${nextPage}`);
                    this.gameSourceService.updatePage(site.name, nextPage);
                } else {
                    console.log(`Poller for ${site.name} navigating to ${nextPage}`);
                    await this._parseSite(siteName, nextPage);
                }
            } else {
                this.gameSourceService.updatePage(site.name, null);
                console.log(`Poller for ${site.name} complete!`);
            }
        } catch (err) {
            console.error(`Error getting next page on page ${page} for '${site.name}'.`, err);
            console.error(err);
        }
    }

    async _scrapeLinks(site, page, selector) {
        let siteUrl = site.url;
        if (page != null) {
            siteUrl = url.resolve(site.url, page);
        }

        const robotUrl = new URL('robots.txt', new URL(siteUrl).origin);
        console.log(`Parsing robots file for ${robotUrl}`);
        await this.robots.useRobotsFor(robotUrl.href);
        const canCrawl = await this.robots.canCrawl(siteUrl);
        console.log(`Can crawl ${siteUrl}? ${canCrawl}`);

        if (!canCrawl) {
            return Promise.reject(`Not allowed to crawl ${siteUrl}`);
        }

        let timeout = 0;

        // Get wait value to adhere to crawl delay
        const crawlDelay = await this.robots.getCrawlDelay();
        console.log(`Crawl delay for ${siteUrl}: ${crawlDelay} seconds`);
        if (site.lastPolled) {
            const lastPoll = moment(site.lastPolled[ip.address()]);
            if (lastPoll) {
                const timeSinceLastPoll = moment.duration(moment().diff(lastPoll)).seconds();
                if (timeSinceLastPoll < crawlDelay) {
                    timeout = (crawlDelay - timeSinceLastPoll) * 1000;
                }
            }
        }

        if (timeout) {
            console.log(`Waiting ${timeout} ms before attempting next parse`);
        }

        return new Promise((res, rej) => {
            setTimeout(
                async (u, s) => {
                    try {
                        const result = await axios.get(
                            `${this.scraperBaseUrl}scrape/link?url=${encodeURIComponent(u)}&selector=${encodeURIComponent(s)}`
                        );
                        this.gameSourceService.logLastPolled(site.name, ip.address());
                        res(result);
                    } catch (err) {
                        rej(err);
                    }
                },
                timeout,
                siteUrl,
                selector
            );
        });
    }
}
