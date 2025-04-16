import { AppContext } from "../context";
import admin from "firebase-admin";

// wipes historical data for a subscription
export const wipe = async (context: AppContext, subscription: string) => {    
    try {
        const docSnap = await context.refs.dataRef.get();
        if (!docSnap.exists) {
            // console.log("No document found!");
            return null;
        }
        const data = docSnap.data()
        for (const key of Object.keys(data)) {
            if (key.includes(subscription)) {
                await context.refs.dataRef.update({
                    [key]: admin.firestore.FieldValue.delete(),
                });
            }
        }
    } catch (error) {
        console.error("Error clearing document:", error);
    }
}

// cleanup historical firestore data after 1h
export const cleanup = async (context: AppContext) => {
    const now = Date.now();
    const threshold = now - 60 * 60 * 1000; // 60 minutes in ms
    try {
        const docSnap = await context.refs.dataRef.get();
        if (!docSnap.exists) {
            // console.log("No document found!");
            return null;
        }
        const data = docSnap.data()
        for (const key of Object.keys(data)) {
            if (new Date(data[key].creationDate) < new Date(threshold)) {
                await context.refs.dataRef.update({
                    [key]: admin.firestore.FieldValue.delete(),
                });
            }
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
    context.storage["cleanup"] = new Date().getTime();
    return;
}
