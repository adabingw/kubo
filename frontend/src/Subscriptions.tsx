import { useEffect, useState, useContext } from "react";
import { SocketContext, SubDict } from "./App";
import { Sub } from "./types";

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
                    result.forEach((sub: Sub) => {
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
        socket.emit("unsubscribe", {
            stopCode,
            session
        });
    }

    return (
        <div className="w-full flex flex-col mt-5">
            {Object.keys(subscriptions).map((i) => (
                <div key={`${subscriptions[i].stop.stopCode}`} className="border-b-1 flex flex-row items-center justify-between my-2">
                    <span>
                        {subscriptions[i].stop.stopName}
                    </span>
                    <span className="button-16 mb-2" onClick={() => unsubscribeClick(subscriptions[i].stop.stopCode.toString())}>
                        unsubscribe
                    </span>
                </div>
            ))}
        </div>
    );
}

export default Subscriptions;
