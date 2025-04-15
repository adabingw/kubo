import { useEffect, useState, useContext } from "react";
import { SocketContext, SubDict } from "../App";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-regular-svg-icons";
import { Tooltip } from "@mui/material";
import { faBus, faTrain, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { fetchSubscriptions } from "../utils/subscription";

function Subscriptions() {

    const [subscriptions, setSubscriptions] = useState<SubDict>({});
    const { socket, session } = useContext(SocketContext);
    const ip = import.meta.env.VITE_SERVER_IP || "34.120.108.49";
    const navigate = useNavigate();

    const fetchData = async() => {
        const sub = await fetchSubscriptions(ip, session);
        setSubscriptions({... sub});
    }

    useEffect(() => {
        fetchData();
    }, [session]);

    useEffect(() => {
        const subscriptions = localStorage.getItem(`kubo-subscriptions`);
        if (subscriptions) {
            try {
                setSubscriptions(JSON.parse(subscriptions))
                return;
            } catch (e) {
                console.error(`Error parsing JSON: ${e}`);
            }
        } else {
            fetchData();
        }
    }, []);

    useEffect(() => {
        socket.on('unsubscribe-success', () => {
            fetchData();
        });
    }, [])

    useEffect(() => {
        socket.on('subscribe-success', () => {
            fetchData();
        })
    }, [])

    const unsubscribeClick = (stopCode: string) => {
        const schema = {
            type: 'stop',
            stopCode: stopCode
        }
        socket.emit("unsubscribe", {
            schema,
            session
        });
    }

    return (
        <div className="w-full flex flex-col mt-5">
            <div className="font-semibold italic">stop subscriptions</div>
            <div className="mx-10 mt-5">
            {Object.keys(subscriptions).map((i) => (
                <div key={`${subscriptions[i].stop.stopCode}`} className="border-b-1 group flex flex-row items-center justify-between pb-2 my-2">
                    <span>
                        {subscriptions[i].stop.type.toLowerCase().includes('train') ? 
                            <FontAwesomeIcon color="#5c5649" icon={faTrain} /> : <FontAwesomeIcon color="#5c5649" icon={faBus} />
                        }
                        <span className="ml-3">{subscriptions[i].stop.stopName}</span>
                    </span>
                    <div className="group-hover:opacity-100 opacity-0">
                        <Tooltip 
                            title={`see updates`} 
                            placement="top" arrow
                        >
                            <span className="border mr-2 border-beige-300 rounded-full px-2 py-1 cursor-pointer hover:bg-beige-100" 
                                onClick={() => {
                                    navigate(`/status/${subscriptions[i].topic}`)
                                }}
                            >
                                <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} color="#5c5649" />
                                <span className="ml-1" >
                                    open
                                </span>
                            </span>
                        </Tooltip>
                        <Tooltip 
                            title={`unsubscribe`} 
                            placement="top" arrow
                        >
                            <span className="border border-beige-300 rounded-full px-2 py-1 cursor-pointer hover:bg-beige-100" onClick={() => unsubscribeClick(subscriptions[i].stop.stopCode.toString())}>
                                <FontAwesomeIcon icon={faBellSlash} color="#5c5649" />
                                <span className="ml-1">
                                    unsubscribe
                                </span>
                            </span>
                        </Tooltip>
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
}

export default Subscriptions;
