export class GameSourcesController {
    constructor({ gameSourcesService }) {
        this.service = gameSourcesService;
    }

    async getAll(req, res) {
        try {
            res.send(await this.service.getAll());
        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    }

    async find(req, res) {
        try {
            res.send(await this.service.find(req.params.name));
        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    }
}
