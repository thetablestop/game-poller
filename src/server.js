import express from 'express';
import cors from 'cors';
import http from 'http';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import * as awilix from 'awilix';
import { GameSourcesService } from './services/game-sources-service.js';
import { GameSourcesController } from './controllers/game-sources-controller.js';

const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.PROXY
});

container.register({
    mongodbProvider: awilix.asFunction(() => {
        if (!process.env.MONGODB_CONNECTION) {
            throw new Error('An environment variable MONGODB_CONNECTION is required with the value of the db connection string.');
        }
        return {
            connect: async () => {
                return new Promise((res, rej) => {
                    MongoClient.connect(
                        process.env.MONGODB_CONNECTION,
                        {
                            useUnifiedTopology: true
                        },
                        (err, client) => {
                            if (err) rej(err);
                            console.log('Connected to db');
                            res(client.db(process.env.MONGODB_NAME || 'database'));
                        }
                    );
                });
            }
        };
    }),
    gameSourcesController: awilix.asClass(GameSourcesController),
    gameSourcesService: awilix.asClass(GameSourcesService)
});

const app = express();
const router = express.Router();
const httpServer = http.createServer(app);
app.use(bodyParser.urlencoded({ extended: true }))
    .use(
        cors({
            origin: process.env.ORIGINS || '*'
        })
    )
    .use(bodyParser.json())
    .use('/api', router)
    .get('/', (req, res) => {
        const pkg = require('../package.json');
        res.send(`<h1>${pkg.name}</h1>
        <h2>Version: ${pkg.version}</h2>`);
    });

const port = process.env.NODE_PORT || 3003;
httpServer.listen(port);
console.log(`Listening on http://localhost:${port}`);

// Setup routes
router.get('/source', async (req, res) => await container.cradle.gameSourcesController.getAll(req, res));
router.get('/source/:name', async (req, res) => await container.cradle.gameSourcesController.find(req, res));
