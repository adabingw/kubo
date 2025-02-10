import { useEffect, useState } from "react";
import io from "socket.io-client";
import { Message } from "./PubSubType";

const socket = io("http://localhost:5000");

function App() {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        socket.on("new-message", (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });
    }, []);

    return (
        <div>
            <h1>Pub/Sub Messages</h1>
            {messages.map((msg: Message, idx) => (
                <div key={idx}>
                    <strong>{msg.topic}:</strong> {msg.data}
                </div>
            ))}
        </div>
    );
}

export default App;
