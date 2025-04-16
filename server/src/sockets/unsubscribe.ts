import { FieldValue } from "firebase-admin/firestore";
import { AppContext } from "../context";
import { StopParams, TripParams } from "../types";

export const unsubscribe = async (context: AppContext, params: StopParams | TripParams, session: string) => {
    if (!context.users[session]) {
        throw new Error("No session");
    }

    const collection = `${params.type}s`;
    const topic = params.type === 'stop' ? `stop-${params.stopCode}` : `trip-${params.from}-${params.to}`;

    // update user data and remove the stop
    await context.refs.userRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const updatedArray = (data[collection] || []).filter(sub => sub !== topic);
            const updateRefArray = {};
            updateRefArray[collection] = updatedArray;
            context.refs.userRef.update(updateRefArray);
        } else {
            console.error("No such document!");
            return false;
        }
    }).catch((error) => {
        console.error("Error updating array: ", error);
        return false;
    });

    // update subscriptions and remove user from a specific stop
    // if user list empty, remove that doc
    await context.refs.subscriptionsRef.doc(collection).get().then(async (doc) => {
        if (doc.exists) {
            const data = doc.data();
            const topicData = data[topic];
            const subRef = {};

            if (!topicData.users) {
                console.error("No user field for ", topicData, topic);
                return true;
            }
    
            if (topicData.users.length === 1) {
                // Delete the document if no users remain
                subRef[topic] = FieldValue.delete();
                await context.refs.subscriptionsRef.doc(collection).update(subRef);
                // console.log("Subscription document deleted successfully!");
            } else {
                // Otherwise, update the document
                subRef[topic] = FieldValue.arrayRemove(context.users[session].id);
                await context.refs.subscriptionsRef.doc(collection).update(subRef);
                // console.log("Subscription updated successfully!");
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
