import { useEffect, useState, useContext, useRef } from "react";
import { SocketContext } from "../App";
import { Message } from "../types/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBus, faChevronLeft, faFeather, faRotateRight, faTrain } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useParams } from 'react-router';
import { calcTime } from "../utils/time";
import { message_parser, prune_data } from "../utils/message_parser";

function Updates() {

    const { topic } = useParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [filter, setFilter] = useState<string>("");
    const messagesRef = useRef<Message[]>([]);
    const { socket } = useContext(SocketContext);
    const navigate = useNavigate();

    useEffect(() => {
        // runs on reload too
        socket.on(`new-${topic}`, (msgs: { topic: string, data: string, timestamp: string, stop: string}) => {
            const messagesData = message_parser(msgs, messagesRef.current);
            messagesRef.current = messagesData;
            setMessages([...messagesData]);
        });
    }, []);

    // update all timestamps on start
    useEffect(() => {
        const storage = localStorage.getItem(`kubo-messages-${topic}`);
        if (!storage) return;
        try {
            const dataJSON = JSON.parse(storage) as Message[];
            const result = prune_data(dataJSON);
            setMessages([...result]);
        } catch (e) {
            console.error(`Error parsing JSON: ${e}`);
        }
    }, []);

    useEffect(() => {
        updateTimestamps();
    }, [messages]);
      
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
            <div className="flex flex-row items-center h-10 mb-5">
                <FontAwesomeIcon icon={faChevronLeft} color="#5c5649" className="cursor-pointer" onClick={() => {
                    navigate('/subscriptions')
                }} />
                <div className="font-semibold italic ml-3">status updates for {topic?.split('-')[1]}</div>
            </div>
            <div className="flex flex-row w-full items-center mb-5">
                <FontAwesomeIcon icon={faFeather} color="#5c5649" />
                <input placeholder="Filter lines/stops or type bus/train" className="ml-3 w-full" onInput={(e) => setFilter(e.currentTarget.value)} />
                <FontAwesomeIcon icon={faRotateRight} color="#5c5649" className="hover:cursor-pointer"
                    onClick={() => setMessages([...prune_data(messagesRef.current)])}
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
                                <span className="mr-3">{message.data.ServiceType === 'B' ? 
                                    <FontAwesomeIcon color="#5c5649" icon={faBus}></FontAwesomeIcon> : 
                                    <FontAwesomeIcon color="#5c5649" icon={faTrain}></FontAwesomeIcon>}
                                </span>
                                <span className="mr-3 text-gray-500 time-ago" data-timestamp={message.timestamp}>{calcTime(message.timestamp)} ago</span>
                                <span className="font-medium">{message.stop.stopName}</span>
                            </span>
                                <span className="leave-time" data-timestamp={message.data.ScheduledDepartureTime} data-linename={message.data.LineName} data-dirname={message.data.DirectionName}>
                                    {message.data.LineName} ({message.data.DirectionName}) in scheduled to leave in <span>
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

export default Updates;
