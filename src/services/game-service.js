export class GameService {
    constructor({ mongodbProvider }) {
        this.db = mongodbProvider;
    }

    async find(name) {
        const dbo = await this.db.connect();
        return new Promise((res, rej) => {
            dbo.collection('game').findOne({ name: name }, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }

    async upsert(name, link) {
        const dbo = await this.db.connect();
        return new Promise((res, rej) => {
            dbo.collection('game').findOneAndUpdate(
                { name: name },
                {
                    $set: {
                        name: name,
                        link: link
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
