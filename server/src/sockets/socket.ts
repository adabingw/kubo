import { AppContext } from "../context";
import { AlertsListener } from "../listeners";
import { subscribe } from "./subscribe";
import { unsubscribe } from "./unsubscribe";
import { get_setup_data } from "../utils";

export const IOSocket = (context: AppContext) => {
    context.io.on("connection", async socket => {
        console.log("⚡ Client connected!");
    
        // create session for a client and pass to web
        const session = socket.id;
        const client = {
            session,
            socket,
            id: undefined
        }
        context.users[session] = client;
    
        socket.emit('welcome', session);    // send session id for handshake event
        get_setup_data(context, session);   // get cached data from firestore
        AlertsListener(context);            // listen to alerts from go
    
        socket.on('subscribe', async ({schema, session}) => {
            if (await subscribe(context, schema, session)) {
                socket.emit('subscribe-success');
            } else {
                socket.emit('subscribe-error');
            }
        });
        
        socket.on("disconnect", () => {
            if (!context.users[socket.id]) {
                console.error("No session found");
                return;
            }
            const { id } = context.users[socket.id];
            delete context.userMap[id];
            delete context.users[socket.id];
        });
        
        socket.on('unsubscribe', async ({schema, session}) => {
            if (await unsubscribe(context, schema, session)) {
                socket.emit('unsubscribe-success', `Successfully unsubscribed from ${schema}`);
            } else {
                socket.emit('unsubscribe-error', 'Unsubscribe error');
            } 
        });
    });
}
