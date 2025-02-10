const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { PubSub } = require("@google-cloud/pubsub");
const { KEY } = require('./env');
const { PROJECT } = require('./constants')

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const pubsub = new PubSub({
    projectId: PROJECT.PUBSUB_PROJECT_ID,
    keyFilename: path.join(__dirname, "env.json") // Ensure this file is NOT committed to Git
});
const subscriptions = ["subscription-1", "subscription-2"];

subscriptions.forEach(subscriptionName => {
    const subscription = pubsub.subscription(subscriptionName);
    subscription.on("message", message => {
        console.log(`🔔 New message from ${subscriptionName}:`, message.data.toString());
        io.emit("new-message", { topic: subscriptionName, data: message.data.toString() });
        message.ack();
    });
});

const createTopic = async (projectId, topicName) => {
    "use strict";
    const pubsub = new PubSub({ projectId });
    
    try {
        const [topic] = await pubsub.createTopic(topicName);
        console.log(`Topic created: ${topic.name}`);
        return { success: true, message: `Topic created: ${topic.name}` };
    } catch (error) {
        console.error(`Error creating topic: ${error.message}`);
        return { success: false, message: error.message };
    }
}

io.on("connection", socket => {
    console.log("⚡ Client connected!");
    socket.on('createTopic', async ({ projectId, topicName }) => {
        const result = await createTopic(projectId, topicName);
        socket.emit('topicCreated', result);
    });
});

server.listen(5000, () => console.log("🚀 Server running on port 5000"));
