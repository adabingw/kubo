import { useEffect, useState, useContext } from "react";
import { SocketContext } from "./App";
import { Message } from "./types";

function Board() {
    const [messages, setMessages] = useState<Message[]>([]);

    const socket = useContext(SocketContext);

    useEffect(() => {
        socket.on("new-message", (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });
    }, []);

    return (
        <div className="w-full flex justify-center flex-col items-center">

        </div>
    );
}

export default Board;
