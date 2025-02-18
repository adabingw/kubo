const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("http");
const { PubSub } = require("@google-cloud/pubsub");
const admin = require("firebase-admin");
const path = require('path');
const cors = require("cors");

const { PROJECT } = require('./constants');
const serviceAccount = require("./env.json");
const { init_db, get_stop_by_name, get_stop_by_stopcode } = require('./db.js')

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
app.use(express.json()); // Middleware for parsing JSON

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
userRef.onSnapshot((doc) => {
    if (doc.exists) {
        // doc data should be map of list of pubsub subscriptions
        console.log("User data changed:", doc.data());
        const data = doc.data();
        const stops = data.stops;
        if (!stops) {
            console.error('No stops');
        }
        stops.forEach(async sub => {
            const create_get_subscription = async () => {
                try {
                    const [subscription] = await pubsub.topic(sub).createSubscription(sub);
                    console.log(`Subscription ${sub} created.`);
                    return subscription;
                } catch (error) {
                    if (error.code === 6) {
                        console.log(`Subscription ${sub} already exists.`);
                        const subscription = pubsub.subscription(sub);
                        return subscription;
                    } else if (error.code === 5) {
                        console.error('Topic has not been created yet');
                        createTopic(sub);
                    } else {
                        console.error("Error creating subscription:", error);
                        return null;
                    }
                }
            }

            const subscription = await create_get_subscription();
            if (subscription) {
                subscription.on("message", async message => {
                    const stopCode = subscription.name.split('-')
                    if (stopCode.length != 3) return;
                    const stop = await get_stop_by_stopcode(stopCode[2])
                    console.log(stopCode)
                    console.log(stop)
                    console.log(`🔔 New message from ${sub}:`, message.data.toString());
                    io.emit("new-message", { 
                        topic: sub, 
                        data: message.data.toString(), 
                        timestamp: new Date(),
                        stop: JSON.stringify(stop)
                    });
                    message.ack();
                });
            }
        });
    } else {
        console.log("User not found");
    }
});

app.get("/subscriptions", (req, res) => {
    userRef.get().then((doc) => {
        if (doc.exists) {
            const result = []
            const data = doc.data();
            const stops = data.stops;
            if (stops) {
                stops.forEach(async stop => {
                    result.push({
                        topic: stop,
                        stop: await get_stop_by_stopcode(stop)
                    })
                })
            }
            res.json(JSON.stringify(result));
        } else {
            console.error("No such document!");
            res.status(409).json({ error: `Error: document not found` });
            return false;
        }
    }).then(() => {
        console.log("Success!");
    }).catch((error) => {
        console.error("Error updating array: ", error);
        res.status(400).json({ error: `Error: ${error}` });
    });
    res.status(500).json({ error: `Error: server error` });
});

app.get("/search", async (req, res) => {
    const result = await get_stop_by_name(req.query.query);
    console.log(result);
    res.json(JSON.stringify({
        query: query,
        data: result
    }));
});

const createTopic = async (topicName) => {
    "use strict";    
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

const subscribe = async (stopCode) => {
    // check if topic exists in subscribes
    const res = findTopic(stopCode);
    const topicName = `stop-${stopCode}`;
    // if not, create topic and update subscriptions collections
    if (!res) {
        const creationResult = await createTopic(PROJECT.PUBSUB_PROJECT_ID, topicName);
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
    userRef.update({
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

const unsubscribe = async (stopCode) => {
    userRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const updatedArray = (data.yourArrayField || []).filter(item => item !== `stop-${stopCode}`);
            return userRef.update({ yourArrayField: updatedArray });
        } else {
            console.error("No such document!");
            return false;
        }
    }).then(() => {
        console.log("Array updated successfully!");
    }).catch((error) => {
        console.error("Error updating array: ", error);
        return false;
    });
    return true;
}

io.on("connection", socket => {
    console.log("⚡ Client connected!");

    io.emit('welcome');

    socket.on('subscribe', async (stopCode) => {
        if (subscribe(projectId, stopCode)) {
            io.emit('subscribe-success', `Successfully subscribed to ${stopCode}`);
        } else {
            io.emit('subscribe-error', 'Subscription error');
        }
    });
    
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
    
    socket.on('unsubscribe', async (stopCode) => {
        if (unsubscribe(stopCode)) {
            io.emit('unsubscribe-success', `Successfully unsubscribed from ${stopCode}`);
        } else {
            io.emit('unsubscribe-error', 'Unsubscribe error');
        } 
    });
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
