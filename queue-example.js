// Publish
const ch = await this.queue.connect();
const hasQ = await ch.assertQueue(this.gamesQueueName);
if (hasQ) {
    ch.sendToQueue(this.gamesQueueName, Buffer.from(JSON.stringify(entity)));
}

// Consumer
const ch = await this.queue.connect();
const hasQ = await ch.assertQueue(this.gamesQueueName);
if (hasQ) {
    ch.consume(this.gamesQueueName, msg => {
        if (msg !== null) {
            const entity = JSON.parse(msg.content);
            ch.ack(msg);
        }
    });
}
