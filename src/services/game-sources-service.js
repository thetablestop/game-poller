export class GameSourcesService {
    constructor({ mongodbProvider }) {
        this.dbo = mongodbProvider.connect();
        this.collectionName = 'sources';
    }

    async getAll() {
        return new Promise(async (res, rej) => {
            (await this.dbo)
                .collection(this.collectionName)
                .find()
                .toArray((err, result) => {
                    if (err) rej(err);
                    else res(result);
                });
        });
    }

    async find(name) {
        return new Promise(async (res, rej) => {
            (await this.dbo).collection(this.collectionName).findOne({ name: name }, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }

    async insert(source) {
        return new Promise(async (res, rej) => {
            (await this.dbo).collection(this.collectionName).insertOne(source, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }

    async update(source) {
        return new Promise(async (res, rej) => {
            (await this.dbo).collection(this.collectionName).updateOne({ name: source.name }, { $set: source }, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }

    async delete(name) {
        return new Promise(async (res, rej) => {
            (await this.dbo).collection(this.collectionName).findOneAndDelete({ name: name }, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
    }
}
