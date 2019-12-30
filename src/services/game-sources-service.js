export class GameSourcesService {
    constructor({ mongodbProvider }) {
        this.db = mongodbProvider;
    }

    async getAll() {
        const dbo = await this.db.connect();
        return new Promise((res, rej) => {
            console.log(`Querying all sources`);
            dbo.collection('sources')
                .find()
                .toArray((err, result) => {
                    if (err) rej(err);
                    else res(result);
                });
        });
    }

    async find(name) {
        const dbo = await this.db.connect();
        return new Promise((res, rej) => {
            console.log(`Querying source ${name}`);
            dbo.collection('sources').findOne({ name: name }, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }
}
