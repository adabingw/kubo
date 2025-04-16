import { Database } from 'sqlite3';
import { Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { Firestore } from 'firebase-admin/firestore';
import { PubSub } from '@google-cloud/pubsub';
import { UserMap, Users, FirestoreRefs } from './types';

export interface AppContext {
    sqldb: Database;
    db: Firestore;
    io?: IOServer;
    server?: HTTPServer;
    users: Users;                   // mapping of sessionid to socket and userid
    userMap: UserMap;               // mapping of userid to sessionid
    storage: Record<string, any>,   // temp storage only for current run session
    userId: string;
    refs: FirestoreRefs;
    pubsub: PubSub;
}

const context = {
    users: {},
    userMap: {},
    userId: "test",
    storage: {}
} as Partial<AppContext>;

export default context;
