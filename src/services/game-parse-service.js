export class GameParseService {
    constructor({ gameSourcesService, pubSubQueueProvider }) {
        this.gameSourceService = gameSourcesService;
        this.queue = pubSubQueueProvider;
    }

    parse() {}
}
