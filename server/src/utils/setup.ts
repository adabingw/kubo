import { AppContext } from "../context";
import { cleanup } from "./firestore";

export const get_setup_data = async (context: AppContext, session: string) => {
    if (!context.users[session]) {
        throw Error("No session found");
    }

    const { socket } = context.users[session];

    // see if there's any historical data we can cleanup
    try {
        cleanup(context);
    } catch (error) {
        console.error(`Error cleaning up ${error}`);
    }

    // see if there are historical data we can load up
    try {
        const docSnap = await context.refs.dataRef.get();
        if (!docSnap.exists) {
            return null;
        }
        const data = docSnap.data();
        const messages: Record<string, any[]> = {};
        
        for (const key of Object.keys(data)) {
            try {
                // const jsonData = JSON.parse(data[key].data);
                messages[`new-${data[key].type}`] = data[key];
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
