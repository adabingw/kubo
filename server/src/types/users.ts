import { Socket } from "socket.io";

export type Users = {
    [session: string]: {
        id: string;
        socket: Socket;
        session: string;
    };
};

export type UserMap = {
    [userId: string]: string
}
