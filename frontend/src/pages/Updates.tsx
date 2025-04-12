import { useEffect, useState, useContext, useRef } from "react";
import { SocketContext } from "../App";
import { Message } from "../types/types";
import { NextServiceSchema } from "../types/next_service";
import { StopSchema } from "../types/stops";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBus, faFeather, faRotateRight, faTrain } from "@fortawesome/free-solid-svg-icons";

function Board() {

    const [messages, setMessages] = useState<Message[]>([]);
    const [filter, setFilter] = useState<string>("");
    const messagesRef = useRef<Message[]>([]);
    const { socket } = useContext(SocketContext);

    useEffect(() => {
        // runs on reload too
        socket.on("new-message", (msgs: { topic: string, data: string, timestamp: string, stop: string}[]) => {
            const newMessages = [...messagesRef.current];
            const messagesMap: Record<string, Message> = {};
            // for storage purposes
            const messageStorage: Record<string, Message[]> = {};

            for (const msg of msgs) {
                const dataJSON = JSON.parse(msg.data);
                for (const data of dataJSON) {
                    const parsedData = NextServiceSchema.parse(data);
                    const stop_ = StopSchema.parse(JSON.parse(msg.stop));
                    const key = `${stop_.stopCode}-${parsedData.LineCode}`;

                    // if the train/bus already left, ignore this data
                    if (Date.now() >= new Date(parsedData.ScheduledDepartureTime).getTime()) continue;

                    const message = {
                        topic: msg.topic,
                        data: parsedData,
                        timestamp: msg.timestamp,
                        stop: stop_
                    };
                    
                    // store all future services
                    if (!messageStorage[key]) {
                        messageStorage[key] = [message];
                    } else {
                        messageStorage[key].push(message);
                    }

                    messageStorage[key].sort((a,b) => 
                        new Date(a.data.ScheduledDepartureTime).getTime() 
                        - new Date(b.data.ScheduledDepartureTime).getTime())
                    localStorage.setItem(`kubo-data-${key}`, JSON.stringify(messageStorage[key]));

                    // initiate data if it does't exist
                    if (!messagesMap[key]) {
                        messagesMap[key] = message;
                    // if there's no next service, set this as next service
                    } else if (!messagesMap[key].next) {
                        const nextTime = 
                            new Date(parsedData.ScheduledDepartureTime) > 
                            new Date(messagesMap[key].data.ScheduledDepartureTime)
                        if (nextTime) messagesMap[key].next = parsedData.ScheduledDepartureTime;
                    // if there is next service but it's after current, set current as next service
                    } else if (messagesMap[key].next != undefined) {
                        const nextTime = 
                            new Date(parsedData.ScheduledDepartureTime) > 
                            new Date(messagesMap[key].data.ScheduledDepartureTime) && 
                            new Date(parsedData.ScheduledDepartureTime) < 
                            new Date(messagesMap[key].next || '')
                        if (nextTime) messagesMap[key].next = parsedData.ScheduledDepartureTime;
                    }
                }
            }

            // filter out old messages of this stopcode and linecode
            const filteredMessages = newMessages.filter(
                (msg) => !messagesMap[`${msg.stop.stopCode}-${msg.data.LineCode}`]
            );
            
            filteredMessages.push(...Object.values(messagesMap));
            const messagesData = pruneData(filteredMessages);
            messagesRef.current = messagesData;            
            localStorage.setItem(`kubo-saved-messages`, JSON.stringify(messagesData));
            setMessages([...messagesData]);
        });
    }, []);

    // update all timestamps on start
    useEffect(() => {
        const storage = localStorage.getItem(`kubo-saved-messages`);
        console.log(storage)
        if (!storage) return;
        try {
            const dataJSON = JSON.parse(storage) as Message[];
            const result = pruneData(dataJSON);
            setMessages([...result]);
        } catch (e) {
            console.error(`Error parsing JSON: ${e}`);
        }
    }, []);

    useEffect(() => {
        console.log(messages);
        updateTimestamps();
    }, [messages]);

    // go thru all messages and update old messages with new messages
    const pruneData = (data: Message[]): Message[] => {
        const result = [...data];
        for (let i = result.length - 1; i >= 0; i--) {
            const res = result[i];
            const storage = localStorage.getItem(`kubo-data-${res.stop.stopCode}-${res.data.LineCode}`);
            if (storage) {
                const dataJSON = JSON.parse(storage) as Message[];
                if (Array.isArray(dataJSON) && dataJSON.length >= 1) {
                    const service = dataJSON.splice(0, 1)[0];
                    console.log(service);
                }
            }

            if (new Date(res.data.ScheduledDepartureTime).getTime() <= Date.now()) {
                // get new message
                const key = `kubo-data-${res.stop.stopCode}-${res.data.LineCode}`;
                const storage = localStorage.getItem(key);
                if (!storage) {
                    result.splice(i, 1);
                } else {
                    const dataJSON = JSON.parse(storage) as Message[];
                    let splindex = -1;
                    for (let j = 0; j < dataJSON.length; j++) {
                        const d = dataJSON[j];
                        if (new Date(d.data.ScheduledDepartureTime).getTime() > Date.now()) {
                            result[i] = d;
                            splindex = j;
                        }
                    }
                    if (splindex !== -1 && dataJSON.length > splindex + 1) {
                        const nextService = dataJSON[splindex + 1];
                        console.log(nextService);
                        result[i].next = nextService.data.ScheduledDepartureTime;
                    }
                    localStorage.setItem(key, JSON.stringify(splindex !== -1 ? dataJSON.splice(splindex) : dataJSON));
                }
            }
        }
        console.log(result);
        return result;
    }

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
                const timestamp = new Date(element.getAttribute("data-timestamp") || new Date().getTime()).getTime();
                const lineName = element.getAttribute("data-linename");
                const dirName = element.getAttribute("data-dirname");
                const time = calcTime(timestamp || new Date().getTime());
                const text = timestamp > Date.now() ? 
                    `${lineName} (${dirName}) scheduled to leave in ${time}` :
                    `${lineName} (${dirName}) left ${time} ago. Refresh to get new times.`
                element.innerHTML = text;
            }
        }
    }

    setInterval(updateTimestamps, 30000);

    return (
        <div className="w-full flex flex-col mt-5">
            <div className="flex flex-row w-full items-center">
                <FontAwesomeIcon icon={faFeather} color="gray" />
                <input placeholder="Filter lines/stops or type bus/train" className="ml-3 w-full" onInput={(e) => setFilter(e.currentTarget.value)} />
                <FontAwesomeIcon icon={faRotateRight} color="gray" className="hover:cursor-pointer"
                    onClick={() => setMessages([...pruneData(messagesRef.current)])}
                />
            </div>
        {messages.length > 0 &&
            <>
                {messages.map((message) => {
                    const show = message.stop.stopName.toLowerCase().includes(filter) || 
                                    message.data.LineName.toLowerCase().includes(filter) || 
                                    message.data.DirectionName.toLowerCase().includes(filter) ||
                                    "bus".includes(filter.toLowerCase()) && message.data.ServiceType === 'B' || 
                                    "train".includes(filter.toLowerCase()) && message.data.ServiceType === 'T'
                    return (
                        show ? 
                        <div key={`${message.topic}-${message.timestamp}-${message.data.DirectionCode}`} className="border-b-1 flex flex-col mt-2">
                            <span>
                                <span className="mr-3">{message.data.ServiceType === 'B' ? <FontAwesomeIcon icon={faBus}></FontAwesomeIcon> : <FontAwesomeIcon icon={faTrain}></FontAwesomeIcon>}</span>
                                <span className="mr-3 text-gray-500 time-ago" data-timestamp={message.timestamp}>{calcTime(message.timestamp)} ago</span>
                                <span className="font-medium">{message.stop.stopName}</span>
                            </span>
                                <span className="leave-time" data-timestamp={message.data.ScheduledDepartureTime} data-linename={message.data.LineName} data-dirname={message.data.DirectionName}>
                                    {message.data.LineName} ({message.data.DirectionName}) scheduled to leave in <span>
                                        {calcTime(message.data.ScheduledDepartureTime)}</span>
                                </span>
                            
                            <span className="mb-2">
                                Next service: {message.next ? message.next : "unavailable"}
                            </span>
                        </div> 
                        : 
                        <></>
                    )
                })}
            </>
        }
        </div>
    );
}

export default Board;
