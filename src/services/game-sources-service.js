export class GameSourcesService {
    constructor({ mongodbProvider }) {
        this.dbo = mongodbProvider.connect();
    }

    async getAll() {
        return new Promise(async (res, rej) => {
            (await this.dbo)
                .collection('sources')
                .find()
                .toArray((err, result) => {
                    if (err) rej(err);
                    else res(result);
                });
        });
    }

    async find(name) {
        return new Promise(async (res, rej) => {
            (await this.dbo).collection('sources').findOne({ name: name }, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }
}
