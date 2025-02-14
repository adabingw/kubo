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

    const onSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
        console.log(e.currentTarget.value);
        socket.emit('search', e.currentTarget.value);
    }

    return (
        <div className="">
            <h1>kubo.</h1>
            <div>search stops</div>
            <input placeholder="search me!" onInput={onSearchInput} />
            <div className="mt-5">stop updates</div>
            {(messages.length > 0) ? 
                <>{messages.map((msg: Message, idx) => (
                    <div key={idx}>
                        <strong>{msg.topic}:</strong> {msg.data}
                    </div>
                ))}</> : <p>subscribe to stops to start seeing its updates!!</p>
            }
        </div>
    );
}

export default App;
