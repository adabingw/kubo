import { useEffect, useState, useContext } from "react";
import { SocketContext } from "./App";
import { Message, MessageSchema, NextService, Stop, StopSchema } from "./types";

function Board() {

    const SQUARE_ONE = {
        "stopCode": "00132",
        "stopName": "Square One",
        "type": "Bus Terminal"
    }

    const UNION = {
        "stopCode": "UN",
        "stopName": "Union Station GO",
        "type": "Train Station"
    }

    const getMinutes = (mins: number) => {
        const now = new Date()
        now.setMinutes(now.getMinutes() - mins);
        return now.toISOString();
    }

    const getSeconds = (secs: number) => {
        const now = new Date();
        now.setSeconds(now.getSeconds() - secs);
        return now.toISOString();
    }

    const testMessages = [
        {
            "topic": "stop-00132",
            "data": "25C bound for University of Waterloo scheduled to leave in 5 minutes.",
            "timestamp": getMinutes(0).toString(),
            "stop": SQUARE_ONE
        },
        {
            "topic": "stop-UN",
            "data": "Go train bound for Oshawa scheduled to leave in 25 minutes.",
            "timestamp": getSeconds(20).toString(),
            "stop": UNION
        },
        {
            "topic": "stop-00132",
            "data": "25C bound for University of Waterloo scheduled to leave in 15 minutes.",
            "timestamp": getMinutes(10).toString(),
            "stop": SQUARE_ONE
        },
        {
            "topic": "stop-UN",
            "data": "Go train bound for Milton GO has left.",
            "timestamp": getMinutes(12).toString(),
            "stop": UNION
        },
        {
            "topic": "stop-UN",
            "data": "Go train bound for Milton GO scheduled to leave in 5 minutes",
            "timestamp": getMinutes(17).toString(),
            "stop": UNION
        },
        {
            "topic": "stop-00132",
            "data": "25C bound for University of Waterloo scheduled to leave in 25 minutes.",
            "timestamp": getMinutes(20).toString(),
            "stop": SQUARE_ONE
        },
    ]

    const [messages, setMessages] = useState<Message[]>([]);
    const socket = useContext(SocketContext);

    useEffect(() => {
        socket.on("new-message", (msgs: { topic: string, data: string, timestamp: string, stop: string}) => {
            const newMessages = [...messages];
            const messagesMap: Record<string, Message> = {}
            const dataJSON = JSON.parse(msgs.data);
            for (const data of dataJSON) {
                console.log(data);
                const parsedData = NextService.parse(data);
                if (!messagesMap[parsedData.LineCode]) {
                    messagesMap[parsedData.LineCode] = {
                        topic: msgs.topic,
                        data: parsedData,
                        timestamp: msgs.timestamp,
                        stop: StopSchema.parse(JSON.parse(msgs.stop))
                    }
                } else if (!messagesMap[parsedData.LineCode].next) {
                    console.log(parsedData.ScheduledDepartureTime, messagesMap[parsedData.LineCode].data.ScheduledDepartureTime)
                    const nextTime = 
                        new Date(parsedData.ScheduledDepartureTime) > 
                        new Date(messagesMap[parsedData.LineCode].data.ScheduledDepartureTime)
                    console.log(nextTime)
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
            console.log(messagesMap);
            newMessages.push(...Object.values(messagesMap));
            while (newMessages.length > 20) newMessages.shift();
            setMessages([...newMessages]);
        });
    }, []);

    const calcTime = (t: string): string => {
        const timestamp = new Date(t).getTime();
        const now = Date.now();
        const deltaSeconds = Math.floor((now - timestamp) / 1000);
    
        const minutes = Math.floor(deltaSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
    
        if (deltaSeconds < 60) {
            return `${deltaSeconds} seconds ago`;
        } else if (minutes < 60) {
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else {
            return `${days} days ago`;
        }
    }

    return (
        <div className="w-full flex flex-col mt-5">
            {messages.map((message) => (
                <div key={`${message.topic}-${message.timestamp}-${message.data.DirectionCode}`} className="border-b-1 flex flex-col mt-2">
                    <span>
                        <span className="mr-3 text-gray-500">{calcTime(message.timestamp)}</span>
                        <span className="font-medium">{message.stop.stopName}</span>
                    </span>
                    <span className="mb-2">{message.data.DirectionName}</span>
                </div>
            ))}
        </div>
    );
}

export default Board;
