const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("http");
const { PubSub } = require("@google-cloud/pubsub");
const admin = require("firebase-admin");
const path = require('path');
const cors = require("cors");

const { PROJECT } = require('./constants');
const serviceAccount = require("./env.json");
const { init_db, get_stop_by_name } = require('./db.js')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const pubsub = new PubSub({
    projectId: PROJECT.PUBSUB_PROJECT_ID,
    keyFilename: path.join(__dirname, "env.json")
});

const db = admin.firestore();
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
const server = createServer(app);
const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

const userId = "test";  
const userRef = db.collection("users").doc(userId);

// listening to users collection for userId for updates on subscriptions
// userRef.onSnapshot((doc) => {
//     if (doc.exists) {
//         // doc data should be map of list of pubsub subscriptions
//         console.log("User data changed:", doc.data());
//         const data = doc.data();
//         const stops = data['stops'];
//         if (stops) {
//             subscriptions.forEach(subscriptionName => {
//                 const subscription = pubsub.subscription(subscriptionName);
//                 subscription.on("message", message => {
//                     console.log(`🔔 New message from ${subscriptionName}:`, message.data.toString());
//                     io.emit("new-message", { topic: subscriptionName, data: message.data.toString() });
//                     message.ack();
//                 });
//             });
//         }
//     } else {
//         console.log("User not found");
//     }
// });

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

const findTopic = async(stopCode) => {
    try {
        const userRef = db.collection("users").doc(stopCode);
        const doc = await userRef.get();

        if (!doc.exists) {
            return undefined;
        }

        return doc.data();
    } catch (error) {
        console.error(`Error finding topic: ${error}`);
        return undefined;
    }
}

const subscribeToTopic = async (projectId, stopCode) => {
    // check if topic exists in subscribes
    const res = findTopic(stopCode);
    const topicName = `stop-${stopCode}`;
    // if not, create topic and update subscriptions collections
    if (!res) {
        const creationResult = await createTopic(projectId, topicName);
        console.info(`Topic created! ${creationResult}`);
        try {
            const data = {}
            data[stopCode] = topicName;
            await db.collection("subscriptions").doc("stops").update(data);
        } catch (error) {
            console.error(`Error writing to subscriptions: ${error}`);
            return false;
        }
    }

    // update users collection
    const docRef = db.collection('users').doc(userId);
    docRef.update({
        stops: firebase.firestore.FieldValue.arrayUnion(topicName)
    })
    .then(() => {
        console.log('Array updated successfully!');
    })
    .catch((error) => {
        console.error('Error updating array: ', error);
        return false;
    });
}

const unsubscribeFromTopic = async (projectId, stopCode) => {

}

io.on("connection", socket => {
    console.log("⚡ Client connected!");

    io.emit('welcome');

    socket.on('subscribe', async ({ projectId, stopCode }) => {
        if (subscribeToTopic(projectId, stopCode)) {
            io.emit('success', 'yay!');
        } else {
            io.emit('error', 'bruh');
        }
    });
    
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
    
    socket.on('search', async (query) => {
        const res = await get_stop_by_name(query);
        console.log(res)
        io.emit('search-result', JSON.stringify({
            query: query,
            data: res
        }));
    });
    
    socket.on('unsubscribe', async ({ stopCode }) => {
        console.log('unsubscribe ', stopCode);
    })
    
    socket.on('BOO', (message) => {
        console.log(`AHHHHHH ${message}`);
    })
});

server.listen(5000, () => {
    try {
        console.log('db: ', init_db);
        init_db();
    } catch (err) {
        console.error('cannot setup db', err);
    }
    console.log("🚀 Server running on port 5000")}
);
