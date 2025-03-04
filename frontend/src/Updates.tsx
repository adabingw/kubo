import { useEffect, useState, useContext, useRef } from "react";
import { SocketContext } from "./App";
import { Message, NextService, StopSchema } from "./types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBus, faTrain } from "@fortawesome/free-solid-svg-icons";

function Board() {

    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef<Message[]>([]); // Keep an always-up-to-date reference
    const socket = useContext(SocketContext);

    useEffect(() => {
        socket.on("new-message", (msgs: { topic: string, data: string, timestamp: string, stop: string}[]) => {
            const newMessages = [...messagesRef.current];
            const messagesMap: Record<string, Message> = {}
            for (const msg of msgs) {
                const dataJSON = JSON.parse(msg.data);
                for (const data of dataJSON) {
                    const parsedData = NextService.parse(data);
                    if (!messagesMap[parsedData.LineCode]) {
                        const stop_ = StopSchema.parse(JSON.parse(msg.stop))
                        messagesMap[`${stop_.stopCode}-${parsedData.LineCode}`] = {
                            topic: msg.topic,
                            data: parsedData,
                            timestamp: msg.timestamp,
                            stop: stop_
                        };
                    } else if (!messagesMap[parsedData.LineCode].next) {
                        const nextTime = 
                            new Date(parsedData.ScheduledDepartureTime) > 
                            new Date(messagesMap[parsedData.LineCode].data.ScheduledDepartureTime)
                        if (nextTime) messagesMap[parsedData.LineCode].next = parsedData.ScheduledDepartureTime;
                    } else if (messagesMap[parsedData.LineCode].next != undefined) {
                        const nextTime = 
                            new Date(parsedData.ScheduledDepartureTime) > 
                            new Date(messagesMap[parsedData.LineCode].data.ScheduledDepartureTime) && 
                            new Date(parsedData.ScheduledDepartureTime) < 
                            new Date(messagesMap[parsedData.LineCode].next || '')
                        if (nextTime) messagesMap[parsedData.LineCode].next = parsedData.ScheduledDepartureTime;
                    }
                }
            }
            const filteredMessages = newMessages.filter(
                (msg) => !messagesMap[`${msg.stop.stopCode}-${msg.data.LineCode}`]
            );
            
            filteredMessages.push(...Object.values(messagesMap));
            messagesRef.current = filteredMessages;            
            setMessages([...filteredMessages]);
        });
    }, []);

    useEffect(() => {
        updateTimestamps();
    }, []);

    const calcTime = (t: string | number): string => {
        const timestamp = new Date(t).getTime();
        const now = Date.now();
        const deltaSeconds = Math.floor(Math.abs(now - timestamp) / 1000);
    
        const minutes = Math.floor(deltaSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
    
        if (deltaSeconds < 60) {
            return `${deltaSeconds} second${deltaSeconds == 1 ? '' : 's'}`;
        } else if (minutes < 60) {
            return `${minutes} minute${minutes == 1 ? '' : 's'}`;
        } else if (hours < 24) {
            return `${hours} hour${hours == 1 ? '' : 's'}`;
        } else {
            return `${days} day${days == 1 ? '' : 's'}`;
        }
    }
      
    const updateTimestamps = () => {
        const elements = document.getElementsByClassName("time-ago");
        if (elements) {
            for (const element of elements) {
                const time = element.getAttribute("data-timestamp");
                element.innerHTML = `${calcTime(time || new Date().getTime())} ago`;
            }
        }

        const elements2 = document.getElementsByClassName("leave-time");
        if (elements2) {
            for (const element of elements2) {
                const time = element.getAttribute("data-timestamp");
                element.innerHTML = calcTime(time || new Date().getTime());
            }
        }
    }

    setInterval(updateTimestamps, 30000);

    return (
        <div className="w-full flex flex-col mt-5">
            {messages.map((message) => (
                <div key={`${message.topic}-${message.timestamp}-${message.data.DirectionCode}`} className="border-b-1 flex flex-col mt-2">
                    <span>
                        <span className="mr-3">{message.data.ServiceType === 'B' ? <FontAwesomeIcon icon={faBus}></FontAwesomeIcon> : <FontAwesomeIcon icon={faTrain}></FontAwesomeIcon>}</span>
                        <span className="mr-3 text-gray-500 time-ago" data-timestamp={message.timestamp}>{calcTime(message.timestamp)} ago</span>
                        <span className="font-medium">{message.stop.stopName}</span>
                    </span>
                    <span>
                        {message.data.LineName} ({message.data.DirectionName}) scheduled to leave in <span className="leave-time" data-timestamp={message.data.ScheduledDepartureTime}>
                            {calcTime(message.data.ScheduledDepartureTime)}
                    </span>
                    </span>
                    <span className="mb-2">
                        Next service: {message.next ? message.next : "unavailable"}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default Board;
