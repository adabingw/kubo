import admin from 'firebase-admin';
import { AppContext } from "../context";
import { get_topic, create_topic } from "../utils";
import { StopParams, TripParams } from "../types";

export const subscribe = async (context: AppContext, params: StopParams | TripParams, session) => {
    // check if topic exists in subscribes
    if (!context.users[session]) {
        throw new Error('Session not found for user');
    }

    const topicName = params.type === 'stop' ? `stop-${params.stopCode}` : `trip-${params.from}-${params.to}`;
    try {
        const topicExists = await get_topic(context, topicName);
        const { type, ...remParams } = params;
        // if topic doesn't exist, create it and push it to subscriptions collection
        if (!topicExists) {
            const creationResult = await create_topic(context, topicName);
            console.log(`Topic created! ${creationResult}`);
            try {
                const data = {};
                data[topicName] = {
                    type: type,
                    params: remParams,
                    users: [ context.users[session].id ]
                };

                await context.db.collection("subscriptions").doc(`${params.type}s`).update({
                    [topicName]: data[topicName]
                });
            } catch (error) {
                console.error(`Error writing to subscriptions: ${error}`);
                return false;
            }
        } else {
            const docRef = context.refs.subscriptionsRef.doc(`${params.type}s`);
            await context.db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                const data = doc.data() || {};
                const topic = data[topicName] || {
                    type: type,
                    params: remParams,
                    users: []
                };

                if (!topic.users.includes(context.users[session].id)) {
                    topic.users.push(context.users[session].id);
                }

                transaction.update(docRef, {
                    [topicName]: topic
                });
            });
        }
    } catch (error) {
        console.error(`Error getting topic: ${error}`)
    }

    // update users collection
    const userRefUpdate = {};
    userRefUpdate[`${params.type}s`] = admin.firestore.FieldValue.arrayUnion(
        params.type === 'stop' ? `stop-${params.stopCode}` : `trip-${params.from}-${params.to}`
    )
    await context.refs.userRef.update(userRefUpdate).catch((error) => {
        console.error('Error updating array: ', error);
        return false;
    });
    return true;
}
