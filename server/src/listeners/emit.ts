import { AppContext } from "../context";
import { cleanup } from "../utils";

export const emitMessage = (context: AppContext, session: string, message: any, messageType: string) => {
    if (!session || (session && !context.users[session])) {
        console.error("Cannot find session");
        return;
    }

    const { socket } = context.users[session];
    // emit data to frontend
    socket.emit(messageType, message);

    // check if need to cleanup data
    if (!context.storage["cleanup"] || (context.storage["cleanup"] && new Date(context.storage["cleanup"]).getTime() < Date.now() - 60 * 60 * 1000)) {
        cleanup(context);
    }
}
