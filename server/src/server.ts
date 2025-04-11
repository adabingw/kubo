import express from 'express';
import { Server } from "socket.io";
import { createServer } from "http";
import { PubSub } from "@google-cloud/pubsub";
import admin from 'firebase-admin';
import { inspect } from 'util';
import cors from 'cors';
import { FieldValue } from "firebase-admin/firestore";

import { PUBSUB_PROJECT_ID } from "./constants"
import { SERVICE_ACCOUNT } from "./env";
import { init_db, get_stop_by_name, get_stop_by_stopcode } from './db';
import { create_get_subscription, create_topic, get_topic } from './pubsub';

/**
 * firestore has 3 collections:
 * SUBSCRIPTIONS - stores a subscription's data / used mostly for polling
 *      [topic: string]: {
 *          type: string,
 *          params: [key: string]: string,
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
    credential: admin.credential.cert(SERVICE_ACCOUNT),
});
const pubsub = new PubSub({
    projectId: PUBSUB_PROJECT_ID,
    credentials: {
        client_email: SERVICE_ACCOUNT.clientEmail,
        private_key: SERVICE_ACCOUNT.privateKey
    }
});
const db = admin.firestore();

/**
 * expressjs and socketio setup
 */
const app = express();
app.use(cors({
    origin: "*",  // Allow any frontend
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type"  // Only allow necessary headers
}));
app.use(express.json()); // Middleware for parsing JSON
const server = createServer(app);
const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
});

/**
 * firebase data
 */
const userId = "test";  
const userRef = db.collection("users").doc(userId);
const dataRef = db.collection("data").doc(userId);
const subscriptions = db.collection("subscriptions");

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

interface StopParams {
    type: 'stop',
    stopCode: string
}
interface TripParams {
    type: 'trip'
    from: string,
    to: string
}
const subscribe = async (params: StopParams | TripParams, session) => {
    // check if topic exists in subscribes
    if (!users[session]) {
        throw new Error('Session not found for user');
    }

    const topicName = params.type === 'stop' ? `stop-${params.stopCode}` : `trip-${params.from}-${params.to}`;
    try {
        const topicExists = await get_topic(pubsub, topicName);
        // if topic doesn't exist, create it and push it to subscriptions collection
        if (!topicExists) {
            const creationResult = await create_topic(pubsub, topicName);
            console.log(`Topic created! ${creationResult}`);
            try {
                const data = {};
                const { type, ...remParams } = params;
                data[topicName] = {
                    type: params.type,
                    params: remParams,
                    users: [ users[session].id ]
                };
                await db.collection("subscriptions").doc(`${params.type}s`).update(data);
            } catch (error) {
                console.error(`Error writing to subscriptions: ${error}`);
                return false;
            }
        } else {
            db.collection("subscriptions").doc(`${params.type}s`).update({
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
    const userRefUpdate = {};
    userRefUpdate[`${params.type}s`] = admin.firestore.FieldValue.arrayUnion(
        params.type === 'stop' ? params.stopCode : `${params.from}-${params.to}`
    )
    await userRef.update(userRefUpdate).then(() => {
        console.log('Array updated successfully!');
    }).catch((error) => {
        console.error('Error updating array: ', error);
        return false;
    });
    return true;
}

const unsubscribe = async (params: StopParams | TripParams, session) => {
    if (!users[session]) {
        throw new Error("No session");
    }

    const collection = `${params.type}s`;
    const item = params.type === 'stop' ? params.stopCode : `${params.from}-${params.to}`;
    const topic = params.type === 'stop' ? `stop-${params.stopCode}` : `trip-${params.from}-${params.to}`;

    // update user data and remove the stop
    await userRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const updatedArray = (data[collection] || []).filter(sub => sub !== item);
            const updateRefArray = {};
            updateRefArray[collection] = updatedArray;
            userRef.update(updateRefArray);
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
    await db.collection("subscriptions").doc(collection).get().then(async (doc) => {
        if (doc.exists) {
            const data = doc.data();
            const topicData = data[topic];
            const subRef = {};
    
            if (topicData.users.length === 1) {
                // Delete the document if no users remain
                subRef[topic] = FieldValue.delete();
                await db.collection("subscriptions").doc(collection).update(subRef);
                console.log("Subscription document deleted successfully!");
            } else {
                // Otherwise, update the document
                subRef[topic] = FieldValue.arrayRemove(users[session].id);
                await db.collection("subscriptions").doc(collection).update(subRef);
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

    const { socket } = users[session];

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
        const messages: Record<string, any[]> = {};
        
        for (const key of Object.keys(data)) {
            try {
                const jsonData = JSON.parse(data[key].data);
                messages[`new-${data[key].type}`] = jsonData;
            } catch (e) {
                console.error(`Error parsing JSON ${e}`);
            }
        }

        for (const key of Object.keys(messages)) {
            socket.emit(key, messages[key]);
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
}

const emitMessage = (session: string, message: any, messageType: string) => {
    if (!session || (session && !users[session])) {
        console.error("Cannot find session");
        return;
    }

    const { socket } = users[session];
    // emit data to frontend
    socket.emit(messageType, message);

    // check if need to cleanup data
    if (!memoryStore["cleanup"] || (memoryStore["cleanup"] && new Date(memoryStore["cleanup"]).getTime() < Date.now() - 60 * 60 * 1000)) {
        cleanup();
    }
}

interface StopDataType {
    type: string,
    params: {
        stopCode: string
    };
    users: string[]
}
const parse_stop = async(subscription: string, topic: string, data: StopDataType, message: any, subscribedUsers: string[]) => {
    const stopCode = data.params.stopCode;
    const stop = await get_stop_by_stopcode(stopCode);

    // wipe data for that specific subscription
    await wipe(subscription.replaceAll('/', '-'));

    const postData = {};
    const messageData = { 
        topic: topic, 
        type: 'stop',
        data: message.toString(), 
        timestamp: new Date(),
        stop: JSON.stringify(stop)
    }
    postData[`${new Date().getTime()}-${subscription.replaceAll('/', '-')}`] = {
        creationDate: new Date().getTime(),
        data: JSON.stringify(messageData.data),
        topic: topic,
        type: 'stop'
    };

    // add data to historical data
    await dataRef.set(postData, { merge: true });
    
    for (const user of subscribedUsers) {
        const session = userToSessionMap[user];
        emitMessage(session, messageData, "new-message");
    }
}

const parse_alert = async(subscription: string, topic: string, message: any, type: string) => {
    // wipe data for that specific subscription
    await wipe(subscription.replaceAll('/', '-'));

    console.log(typeof message)

    interface Stop {
        stopCode: string,
        stopName: string
    }
    interface Alert {
        type: 'stop' | 'line',
        subject: string,
        body: string,
        category: string,
        subcategory: string,
        stop: Stop | undefined,
        lines: string | undefined
    }
    const parsedData: Record<string, Alert[]> = {};
    const messages = typeof message === 'string' ? JSON.parse(message) : message;

    for (const message of messages) {
        console.log('alert message: ', message);
        const category = message.Category;
        const data: Alert = {
            type: 'stop',
            subject: message.SubjectEnglish,
            body: message.BodyEnglish,
            category: category,
            subcategory: message.SubCategory,
            stop: undefined,
            lines: undefined
        }
        if (category === "Amenity") {
            message.Stops.forEach(async (m: { Name: string | null, Code: string }) => {
                const stopCode = m.Code;
                if (!parsedData[stopCode]) {
                    parsedData[stopCode] = [];
                }
                parsedData[stopCode].push({
                    ...data,
                    stop:  {
                        stopCode,
                        stopName: (await get_stop_by_stopcode(stopCode)).stopCode
                    }
                })
            });
        } else {
            message.Lines.forEach((line: { Code: string }) => {
                const lineCode = line.Code;
                if (!parsedData[lineCode]) {
                    parsedData[lineCode] = [];
                }
                parsedData[lineCode].push({
                    ...data,
                    type: 'line',
                    lines: line.Code
                })
            });
        }
    }

    const postData = {};
    const messageData = { 
        topic: topic, 
        type: type,
        data: JSON.stringify(parsedData), 
        timestamp: new Date(),
    }
    postData[`${new Date().getTime()}-${subscription.replaceAll('/', '-')}`] = {
        creationDate: new Date().getTime(),
        data: JSON.stringify(messageData.data),
        topic: topic,
        type: type
    };

    // add data to historical data
    await dataRef.set(postData, { merge: true });

    for (const session of Object.keys(users)) {
        emitMessage(session, messageData, `new-${type}`);
    }
}

const parse_trip = async(subscription: string, topic: string, message: any, subscribedUsers: string[]) => {
    // wipe data for that specific subscription
    await wipe(subscription.replaceAll('/', '-'));

    const postData = {};
    const messageData = { 
        topic: topic, 
        type: 'trip',
        data: message.toString(), 
        timestamp: new Date(),
    }
    postData[`${new Date().getTime()}-${subscription.replaceAll('/', '-')}`] = {
        creationDate: new Date().getTime(),
        data: JSON.stringify(messageData.data),
        topic: topic,
        type: 'trip'
    };

    // add data to historical data
    await dataRef.set(postData, { merge: true });

    for (const session of Object.keys(users)) {
        emitMessage(session, messageData, "new-trip");
    }
}

subscriptions.doc('stops').onSnapshot(async (doc) => {
    if (doc.exists) {
        // doc data should be of form topic: string, users: string[]
        const data = doc.data();

        for (const [topic, v] of Object.entries(data)) {
            console.log("Subscription data changed: ", topic, v);
            const subscribedUsers = v.users;
    
            console.log(topic, subscribedUsers);
    
            const subscription = await create_get_subscription(pubsub, topic);
            if (subscription) {
                subscription.on("message", async message => {
                    const data = message.data.toString('utf8');
                    console.log(`Message received for stops ${inspect(data)}`);
                    parse_stop(subscription.name, topic, v, data, subscribedUsers);
                    message.ack();
                });
            }
        }
    } else {
        console.error("Data doesn't exist.");
    }
});

subscriptions.doc('trips').onSnapshot(async (doc) => {
    if (doc.exists) {
        // doc data should be of form topic: string, users: string[]
        const data = doc.data();

        for (const [topic, v] of Object.entries(data)) {
            console.log("Subscription data changed: ", topic, v);
            const subscribedUsers = v.users;
    
            console.log(topic, subscribedUsers);
    
            const subscription = await create_get_subscription(pubsub, topic);
            if (subscription) {
                subscription.on("message", async message => {
                    const data = message.data.toString('utf8');
                    console.log(`Message received for trips ${inspect(data)}`);
                    parse_trip(subscription.name, topic, data, subscribedUsers);
                    message.ack();
                });
            }
        }
    } else {
        console.error("Data doesn't exist.");
    }
});

subscriptions.doc('information-alert').onSnapshot(async (doc) => {
    if (doc.exists) {
        // doc data should be of form topic: string, users: string[]
        const subscription = await create_get_subscription(pubsub, 'information-alert');
        if (subscription) {
            subscription.on("message", async message => {
                const data = message.data.toString('utf8');
                console.log(`Message received for info alert ${inspect(data)}`);
                parse_alert(subscription.name, 'information-alert', data, 'information-alert');
                message.ack();
            });
        }
    } else {
        console.error("Data doesn't exist.");
    }
});

subscriptions.doc('service-alert').onSnapshot(async (doc) => {
    if (doc.exists) {
        // doc data should be of form topic: string, users: string[]
        const subscription = await create_get_subscription(pubsub, 'service-alert');
        if (subscription) {
            subscription.on("message", async message => {
                const data = message.data.toString('utf8');
                console.log(`Message received for service alert ${inspect(data)}`);
                parse_alert(subscription.name, 'service-alert', data, 'service-alert');
                message.ack();
            });
        }
    } else {
        console.error("Data doesn't exist.");
    }
});

/**
 * endpoints
 */
// gets subscription of a user from the userRef collection
app.get("/api/subscriptions", async (req, res) => {
    try {
        const { session: sessionVar } = req.query;
        const session = sessionVar as string;

        console.log(session, users);

        if (!users[session]) {
            return res.status(404).json({ error: "No session found."}).end();
        }

        // get user doc from firestore
        const userId = users[session].id;
        const doc = await db.collection("users").doc(userId).get();
        
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

        return res.status(200).json(result).end();
    } catch (error) {
        console.error("Error getting subscriptions:", error);
        return res.status(500).json({ error: `Error: ${error.message}` }).end();
    }
});

// endpoint to query stopname
app.get("/api/search", async (req, res) => {
    const { query } = req.query;
    const result = await get_stop_by_name(query);
    console.log(result);
    res.status(200).json({
        query: query,
        data: result
    }).end();
});

app.get("/", async (req, res) => {
    console.log("health checkpoint");
    res.status(200).end();
})

// handshake endpoint between frontend and server on startup
app.get("/api/handshake", async (req, res) => {
    const { id: idVar, session: sessionVar } = req.query;
    const session = sessionVar as string;
    const id = idVar as string;
    console.log(`ACK: ${id}, ${session}`);
    if (!users[session]) {
        res.status(404).json({ error: "No session found."}).end();
    }

    users[session].id = id;
    userToSessionMap[id] = session;
    res.status(200).json({
        message: "ACK"
    }).end();
})

/**
 * sockets
 */
io.on("connection", async socket => {
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

    const info_subscription = await create_get_subscription(pubsub, 'information-alert');
    if (info_subscription) {
        info_subscription.on("message", async message => {
            const data = message.data.toString('utf8');
            console.log(`Message received for info alert ${inspect(data)}`);
            parse_alert(info_subscription.name, 'information-alert', data, 'information-alert');
            message.ack();
        });
    }

    const service_subscription = await create_get_subscription(pubsub, 'service-alert');
    if (service_subscription) {
        service_subscription.on("message", async message => {
            const data = message.data.toString('utf8');
            console.log(`Message received for service alert ${inspect(data)}`);
            parse_alert(service_subscription.name, 'service-alert', data, 'service-alert');
            message.ack();
        });
    }

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

const port = process.env.PORT || '80';

server.listen(port, () => {
    try {
        // setup database with proper data
        init_db();
    } catch (err) {
        console.error('cannot setup db', err);
    }
    console.log(`🚀 Server running on port ${port}`)}
);
