import axios from 'axios';
import url from 'url';

export class GameParseService {
    constructor({ gameSourcesService, pubSubQueueProvider }) {
        this.gameSourceService = gameSourcesService;
        this.queue = pubSubQueueProvider;
        const host = process.env.HTML_SCRAPER_SERVICE_HOST || 'localhost';
        const port = process.env.HTML_SCRAPER_SERVICE_PORT || 3002;
        this.scraperBaseUrl = `http://${host}:${port}/api/`;
    }

    async parse() {
        const sites = await this.gameSourceService.getAll();
        for (const s of sites) {
            console.log(`Parsing site with url: ${s.url} and link selector: ${s.linkSelector}`);
            await this._parseSite(s);
        }
    }

    async _parseSite(site, page = null) {
        // Get all the links
        let siteUrl = encodeURIComponent(site.url);
        if (page != null) {
            siteUrl = encodeURIComponent(url.resolve(site.url, page));
        }
        const linkSelector = encodeURIComponent(site.linkSelector);
        const response = await axios.get(`${this.scraperBaseUrl}scrape/link?url=${siteUrl}&selector=${linkSelector}`);
        for (const a of response.data) {
            console.log(`Found link: ${a.content} (${a.link})`);
        }

        // Get the next page link and parse if exists
        const nextPageSelector = encodeURIComponent(site.nextPageSelector);
        const nextPageResponse = await axios.get(`${this.scraperBaseUrl}scrape/link?url=${siteUrl}&selector=${nextPageSelector}`);
        if (nextPageResponse.data && !!nextPageResponse.data.length) {
            console.log(`Navigating to ${nextPageResponse.data[0].link}`);
            await this._parseSite(site, nextPageResponse.data[0].link);
        }
    }
}
