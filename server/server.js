const express = require("express");
const { Server } = require("socket.io");
const { createServer } = require("http");
const { PubSub } = require("@google-cloud/pubsub");
const admin = require("firebase-admin");
const path = require('path');
const cors = require("cors");

const { PROJECT } = require('./constants');
const serviceAccount = require("./env.json");
const { init_db, get_stop_by_name, get_stop_by_stopcode } = require('./db.js');
const { create_get_subscription, create_topic, get_topic } = require('./pubsub.js');

/**
 * firestore has 3 collections:
 * SUBSCRIPTIONS - stores a subscription's data / used mostly for polling
 *      [stopCode: string]: {
 *          topic: string,
 *          users: string[]
 *      }
 * USERS - stores a user's subscriptions / used mostly to query user's data
 *      [userId: string]: string[]
 * DATA - stores historical data for max 1 hour
 *      [userId: string]: {
 *          [${timestamp}-${subscription}: string]: string
 *      }
 */

/**
 * firebase and pubsub setup
 */
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const pubsub = new PubSub({
    projectId: PROJECT.PUBSUB_PROJECT_ID,
    keyFilename: path.join(__dirname, "env.json")
});
const db = admin.firestore();

/**
 * expressjs and socketio setup
 */
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

/**
 * firebase data
 */
const userId = "test";  
const userRef = db.collection("users").doc(userId);
const dataRef = db.collection("data").doc(userId);
const subscriptions = db.collection("subscriptions").doc("stops");

/**
 * temp storage to store session data
 */
const memoryStore = {};

/** 
 * users: list of connected users
 * [session: string]: {
 *      id: string,
 *      socket: Socket,
 *      subscriptions: string[]
 * }
 * userToSessionMap: map of userId to session
*/
const users = {};
const userToSessionMap = {};

// wipes historical data for a subscription
const wipe = async (subscription) => {    
    try {
        const docSnap = await dataRef.get();
        if (!docSnap.exists) {
            console.log("No document found!");
            return null;
        }
        const data = docSnap.data()
        for (const key of Object.keys(data)) {
            if (key.includes(subscription)) {
                await dataRef.update({
                    [key]: admin.firestore.FieldValue.delete(),
                });
            }
        }
    } catch (error) {
        console.error("Error clearing document:", error);
    }
}

// cleanup historical firestore data after 1h
const cleanup = async () => {
    const now = Date.now();
    const threshold = now - 60 * 60 * 1000; // 60 minutes in ms
    try {
        const docSnap = await dataRef.get();
        if (!docSnap.exists) {
            console.log("No document found!");
            return null;
        }
        const data = docSnap.data()
        for (const key of Object.keys(data)) {
            if (new Date(data[key].creationDate) < new Date(threshold)) {
                await dataRef.update({
                    [key]: admin.firestore.FieldValue.delete(),
                });
            }
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
    memoryStore["cleanup"] = new Date().getTime();
    return;
}

const subscribe = async (stopCode, session) => {
    // check if topic exists in subscribes
    if (!users[session]) {
        throw new Error('Session not found for user');
    }

    const topicName = `stop-${stopCode}`;
    try {
        const topicExists = await get_topic(pubsub, topicName);
        // if topic doesn't exist, create it and push it to subscriptions collection
        if (!topicExists) {
            const creationResult = await create_topic(pubsub, topicName);
            console.log(`Topic created! ${creationResult}`);
            try {
                const data = {};
                data[stopCode] = {
                    topic: topicName,
                    users: [ users[session].id ]
                };
                await db.collection("subscriptions").doc("stops").update(data);
            } catch (error) {
                console.error(`Error writing to subscriptions: ${error}`);
                return false;
            }
        } else {
            db.collection("subscriptions").doc(stopCode).update({
                users: admin.firestore.FieldValue.arrayUnion(users[session].id)
            }).then(() => {
                console.log("User added to subscriptions successfully!");
            }).catch((error) => {
                console.error("Error updating document: ", error);
            });
        }
    } catch (error) {
        console.error(`Error getting topic: ${error}`)
    }

    // update users collection
    await userRef.update({
        stops: admin.firestore.FieldValue.arrayUnion(topicName)
    }).then(() => {
        console.log('Array updated successfully!');
    }).catch((error) => {
        console.error('Error updating array: ', error);
        return false;
    });
    return true;
}

const unsubscribe = async (stopCode, session) => {
    if (!users[session]) {
        throw new Error("No session");
    }

    // update user data and remove the stop
    await userRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const updatedArray = (data.stops || []).filter(item => item !== `stop-${stopCode}`);
            userRef.update({ stops: updatedArray });
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

    // update subscriptions and remove user from a specific stop
    // if user list empty, remove that doc
    await db.collection("subscriptions").doc(stopCode).get().then(async (doc) => {
        if (doc.exists) {
            const data = doc.data();
            const updatedUsers = (data.users || []).filter(item => item !== users[session].id);
    
            if (updatedUsers.length === 0) {
                // Delete the document if no users remain
                await db.collection("subscriptions").doc(stopCode).delete();
                console.log("Subscription document deleted successfully!");
            } else {
                // Otherwise, update the document
                await db.collection("subscriptions").doc(stopCode).update({ users: updatedUsers });
                console.log("Subscription updated successfully!");
            }
        } else {
            console.error("No such subscription document");
            return false;
        }
    }).catch((error) => {
        console.error("Error updating subscription: ", error);
    });

    return true;
}

const get_setup_data = async (session) => {
    if (!users[session]) {
        throw Error("No session found");
    }

    const { id, socket } = users[session];

    // see if there's any historical data we can cleanup
    try {
        cleanup();
    } catch (error) {
        console.error(`Error cleaning up ${error}`);
    }

    // see if there are historical data we can load up
    try {
        const docSnap = await dataRef.get();
        if (!docSnap.exists) {
            return null;
        }
        const data = docSnap.data();
        const messages = [];
        
        for (const key of Object.keys(data)) {
            try {
                const jsonData = JSON.parse(data[key].data);
                messages.push(jsonData)
            } catch (e) {
                console.error(`Error parsing JSON ${e}`);
            }
        }
        socket.emit("new-message", messages);
    } catch (error) {
        console.error("Error getting document:", error);
    }
}

subscriptions.onSnapshot(async (doc) => {
    if (doc.exists) {
        // doc data should be of form topic: string, users: string[]
        const data = doc.data();

        for (const [k, v] of Object.entries(data)) {
            console.log("Subscription data changed: ", k, v);
            const topic = v.topic;
            const subscribedUsers = v.users;
    
            console.log(topic, subscribedUsers)
    
            if (!topic) {
                console.error("No topic");
                return;
            }
    
            const subscription = await create_get_subscription(pubsub, topic);
            if (subscription) {
                subscription.on("message", async message => {
                    const stopCode = subscription.name.split('-');
                    if (stopCode.length != 3) return;
                    const stop = await get_stop_by_stopcode(stopCode[2]);
    
                    // wipe data for that specific subscription
                    await wipe(subscription.name.replaceAll('/', '-'));
    
                    const data = {};
                    data[`${new Date().getTime()}-${subscription.name.replaceAll('/', '-')}`] = {
                        creationDate: new Date().getTime(),
                        data: JSON.stringify({ 
                            topic: topic, 
                            data: message.data.toString(), 
                            timestamp: new Date(),
                            stop: JSON.stringify(stop)
                        })
                    };
    
                    // add data to historical data
                    await dataRef.set(data, { merge: true });
    
                    for (const user of subscribedUsers) {
                        const session = userToSessionMap[user];
                        if (!session || (session && !users[session])) {
                            console.error("Cannot find session");
                            return;
                        }
    
                        const { socket } = users[session];
                        // emit data to frontend
                        socket.emit("new-message", [{ 
                            topic: topic, 
                            data: message.data.toString(), 
                            timestamp: new Date(),
                            stop: JSON.stringify(stop)
                        }]);
                        message.ack();
    
                        // check if need to cleanup data
                        if (!memoryStore["cleanup"] || (memoryStore["cleanup"] && new Date(memoryStore["cleanup"]).getTime() < Date.now() - 60 * 60 * 1000)) {
                            cleanup();
                        }
                    }
                });
            }
        }
    } else {
        console.error("Data doesn't exist.");
    }
});

/**
 * endpoints
 */
// gets subscription of a user
app.get("/api/subscriptions", async (req, res) => {
    try {
        const { session } = req.query;

        if (!users[session]) {
            return {
                status: 404,
                message: 'No session found'
            }
        }

        const userId = users[session].id;
        const doc = db.collection("users").doc(userId).get();
        
        if (!doc.exists) {
            console.error("No such document!");
            return res.status(404).json({ error: "Error: document not found" });
        }

        const data = doc.data();
        const stops = data.stops || [];

        const result = await Promise.all(
            stops.map(async (stop) => ({
                topic: stop,
                stop: await get_stop_by_stopcode(stop.split('-')[1]),
            }))
        );
        console.log(result)

        return res.json(result);
    } catch (error) {
        console.error("Error getting subscriptions:", error);
        return res.status(500).json({ error: `Error: ${error.message}` });
    }
});

// endpoint to query stopname
app.get("/api/search", async (req, res) => {
    const { query } = req.query;
    const result = await get_stop_by_name(query);
    console.log(result);
    res.json(JSON.stringify({
        query: query,
        data: result
    }));
});

// handshake endpoint between frontend and server on startup
app.get("/api/handshake", async (req, res) => {
    const { id, session } = req.query;
    console.log(`ACK: ${id}, ${session}`);
    if (!users[session]) {
        return {
            status: 404,
            message: 'No session found'
        }
    }

    users[session].id = id;
    userToSessionMap[id] = session;
    return {
        status: 200,
        message: "ACK"
    }
})

/**
 * sockets
 */
io.on("connection", socket => {
    console.log("⚡ Client connected!");

    // create session for a client and pass to web
    const session = socket.id;
    const client = {
        session,
        socket,
        id: undefined
    }
    users[session] = client;

    console.log(`Client info: ${client.session}`);

    socket.emit('welcome', session);

    get_setup_data(session);

    socket.on('subscribe', async ({stopCode, session}) => {
        if (await subscribe(stopCode, session)) {
            socket.emit('subscribe-success');
        } else {
            socket.emit('subscribe-error');
        }
    });
    
    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
        if (!users[socket.id]) {
            console.error("No session found");
            return;
        }
        const { id } = users[socket.id];
        delete userToSessionMap[id];
        delete users[socket.id];
    });
    
    socket.on('unsubscribe', async ({stopCode, session}) => {
        if (await unsubscribe(stopCode, session)) {
            socket.emit('unsubscribe-success', `Successfully unsubscribed from ${stopCode}`);
        } else {
            socket.emit('unsubscribe-error', 'Unsubscribe error');
        } 
    });
});

server.listen(5000, () => {
    try {
        // setup database with proper data
        init_db();
    } catch (err) {
        console.error('cannot setup db', err);
    }
    console.log("🚀 Server running on port 5000")}
);
