export class GameService {
    constructor({ mongodbProvider }) {
        this.dbo = mongodbProvider.connect();
        this.collectionName = 'games';
    }

    async find(name) {
        return new Promise(async (res, rej) => {
            (await this.dbo).collection(this.collectionName).findOne({ name: name }, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }

    async upsert(name, sourceName, link) {
        return new Promise(async (res, rej) => {
            (await this.dbo).collection(this.collectionName).findOneAndUpdate(
                { name: name },
                {
                    $set: {
                        name: name,
                        link: link,
                        sourceName: sourceName
                    }
                },
                {
                    returnOriginal: false,
                    sort: [['name', 1]],
                    upsert: true
                },
                (err, result) => {
                    if (err) rej(err);
                    else res(result);
                }
            );
        });
    }
}
