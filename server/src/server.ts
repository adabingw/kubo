import express from 'express';
import { Server } from "socket.io";
import { createServer } from "http";
import { PubSub } from "@google-cloud/pubsub";
import admin from 'firebase-admin';
import cors from 'cors';
import sqlite3 from "sqlite3";

import { PUBSUB_PROJECT_ID, init_db } from "./utils"
import { SERVICE_ACCOUNT } from "./env/env";
import context, { AppContext } from './context';
import { searchRoute, handshakeRoute, subscriptionsRoute } from './routes';
import { IOSocket } from './sockets';

const app = express();
app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type"
}));
app.use(express.json());
const server = createServer(app);
const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
});

const port = process.env.PORT || '80';

server.listen(port, async () => {
    const sqldb = new sqlite3.Database('./db');
    const pubsub = new PubSub({
        projectId: PUBSUB_PROJECT_ID,
        credentials: {
            client_email: SERVICE_ACCOUNT.clientEmail,
            private_key: SERVICE_ACCOUNT.privateKey
        }
    });
    admin.initializeApp({
        credential: admin.credential.cert(SERVICE_ACCOUNT),
    });
    const db = admin.firestore();
    const userRef = db.collection("users").doc(context.userId);
    const dataRef = db.collection("data").doc(context.userId);
    const subscriptionsRef = db.collection("subscriptions");

    // initialize context
    context.io = io;
    context.sqldb = sqldb;
    context.server = server;
    context.db = db;
    context.refs = {
        userRef: userRef,
        dataRef: dataRef,
        subscriptionsRef: subscriptionsRef
    }
    context.pubsub = pubsub;

    await init_db(context as AppContext);       // initialize sqlite3 db
    IOSocket(context as AppContext);            // initialize socket

    // initialize endpoints
    app.use("/api/subscriptions", subscriptionsRoute(context as AppContext));
    app.use("/api/search", searchRoute(context as AppContext));
    app.use("/api/handshake", handshakeRoute(context as AppContext));
    app.use("/", async (_, res) => res.status(200).end());

    console.log(`🚀 Server running on port ${port}`);
});
