import { useEffect, useState, useContext } from "react";
import { SocketContext, SubDict } from "../App";
import { Subscription } from "../types/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-regular-svg-icons";
import { Tooltip } from "@mui/material";
import { faBus, faTrain, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons";

function Subscriptions() {

    const [subscriptions, setSubscriptions] = useState<SubDict>({});
    const { socket, session } = useContext(SocketContext);
    const ip = import.meta.env.VITE_SERVER_IP || "34.120.108.49";

    const fetchSubscriptions = () => {
        if (!session) {
            console.error("Session not defined");
            return;
        }
        fetch(`http://${ip}/api/subscriptions?session=${session}`)
            .then(res => res.json())
            .then(data => {
                try {
                    if (data.error) {
                        throw data.error;
                    }
                    console.log(`Fetch subscriptions data: ${JSON.stringify(data)}`);
                    const result = data;
                    const dict: SubDict = {}
                    result.forEach((sub: Subscription) => {
                        const key = sub.stop.stopCode.toString();
                        dict[key] = sub
                    })
                    console.log(`Fetch subscriptions dict: ${JSON.stringify(dict)}`);
                    localStorage.setItem(`kubo-subscriptions`, JSON.stringify(dict));
                    setSubscriptions(dict);
                    return result;
                } catch (e) {
                    console.error(`Error while parsing search result: ${e}`);
                }
            });
        return {};
    }

    useEffect(() => {
        console.log("Session updated ", session);
        fetchSubscriptions();
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
            fetchSubscriptions();
        }
    }, []);

    useEffect(() => {
        socket.on('unsubscribe-success', () => {
            fetchSubscriptions();
        });
    }, [])

    useEffect(() => {
        socket.on('subscribe-success', () => {
            fetchSubscriptions();
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
                <div key={`${subscriptions[i].stop.stopCode}`} className="border-b-1 flex flex-row items-center justify-between pb-2 my-2">
                    <span>
                        {subscriptions[i].stop.type.toLowerCase().includes('train') ? 
                            <FontAwesomeIcon color="#5c5649" icon={faTrain} /> : <FontAwesomeIcon color="#5c5649" icon={faBus} />
                        }
                        <span className="ml-3">{subscriptions[i].stop.stopName}</span>
                    </span>
                    <div>
                        <Tooltip 
                            title={`see updates`} 
                            placement="top" arrow
                        >
                            <span className="border mr-2 border-beige-300 rounded-full px-2 py-1 cursor-pointer hover:bg-beige-100" onClick={() => unsubscribeClick(subscriptions[i].stop.stopCode.toString())}>
                                <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} color="#5c5649" />
                                <span className="ml-1">
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
