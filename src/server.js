import express from 'express';
import cors from 'cors';
import http from 'http';
import bodyParser from 'body-parser';
import amqp from 'amqplib';
import { MongoClient } from 'mongodb';
import * as awilix from 'awilix';
import { GameSourcesService } from './services/game-sources-service.js';
import { GameSourcesController } from './controllers/game-sources-controller.js';
import { GameParseService } from './services/game-parse-service.js';

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
    pubSubQueueProvider: awilix.asFunction(() => {
        if (!process.env.RABBITMQ_PUBSUB_CONNECTION) {
            throw new Error(
                'An environment variable RABBITMQ_PUBSUB_CONNECTION is required with the value of the queue connection string.'
            );
        }
        return {
            connect: async () => {
                const conn = await amqp.connect(process.env.RABBITMQ_PUBSUB_CONNECTION);
                return await conn.createChannel();
            }
        };
    }),
    gameSourcesController: awilix.asClass(GameSourcesController),
    gameSourcesService: awilix.asClass(GameSourcesService),
    gameParseService: awilix.asClass(GameParseService)
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
    })
    .get('/status', async (req, res) => {
        let result = '';
        try {
            await container.cradle.mongodbProvider.connect();
            result += 'DB connection: Successful<br />';
        } catch (err) {
            result += `DB connection: Error: ${err}<br />`;
        }

        try {
            var channel = await container.cradle.pubSubQueueProvider.connect();
            if (channel) {
                result += 'Queue channel connection: Successful<br />';
            } else {
                result += 'Queue channel connection: Failed<br />';
            }
            channel.close();
        } catch (err) {
            result += `Queue channel connection: ${err}<br />`;
        }
        res.send(result);
    });

const port = process.env.NODE_PORT || 3003;
httpServer.listen(port);
console.log(`Listening on http://localhost:${port}`);

// Setup job
let paused = false;
const poll = async () => {
    const svc = container.cradle.gameParseService;
    try {
        await svc.parse();
        if (!paused) {
            setTimeout(poll, (process.env.TASK_INTERVAL || 60) * 1000);
        }
    } catch (err) {
        console.error(err);
    }
};
poll();

// Setup routes
router.get('/source', async (req, res) => await container.cradle.gameSourcesController.getAll(req, res));
router.get('/source/:name', async (req, res) => await container.cradle.gameSourcesController.find(req, res));
router.get('/task/pause', (req, res) => {
    paused = true;
    res.send('Task Paused');
});
router.get('/task/resume', (req, res) => {
    paused = false;
    poll();
    res.send('Task Resumed');
});
