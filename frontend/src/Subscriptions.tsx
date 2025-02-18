import { useEffect, useState, useContext } from "react";
import { SocketContext } from "./App";
import { Sub, SubListSchema } from "./types";

function Subscriptions() {

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

    const testSubs = [
        {
            "topic": "stop-00132",
            "stop": SQUARE_ONE
        },
        {
            "topic": "stop-UN",
            "stop": UNION
        },

    ]

    const [subscriptions, setSubscriptions] = useState<Sub[]>(testSubs);
    const socket = useContext(SocketContext);

    const fetchSubscriptions = () => {
        fetch(`http://localhost:5000/api/subscriptions`)
            .then(res => res.json())
            .then(data => {
                try {
                    const result = JSON.parse(data);
                    localStorage.setItem(`kubo-subscriptions`, JSON.stringify(result));
                    setSubscriptions(SubListSchema.parse(result));
                } catch (e) {
                    console.error(`Error while parsing search result: ${e}`);
                }
            });
    }

    useEffect(() => {
        const subscriptions = localStorage.getItem(`kubo-subscriptions`);
        if (subscriptions) {
            try {
                setSubscriptions(SubListSchema.parse(JSON.parse(subscriptions)))
                return;
            } catch (e) {
                console.error(`Error parsing JSON: ${e}`);
            }
        } else {
            fetchSubscriptions();
        }

        socket.on('unsubscribe-success', () => {
            fetchSubscriptions();
        });

        socket.on('subscribe-success', () => {
            fetchSubscriptions();
        })
    }, []);

    const unsubscribeClick = (topic: string) => {
        socket.emit("unsubscribe", topic);
    }

    return (
        <div className="w-full flex flex-col mt-5">
            {subscriptions.map((subscription) => (
                <div key={`${subscription.stop.stopCode}`} className="border-b-1 flex flex-row items-center justify-between my-2">
                    <span>
                        {subscription.stop.stopName}
                    </span>
                    <span className="button-16 mb-2" onClick={() => unsubscribeClick(subscription.topic)}>unsubscribe</span>
                </div>
            ))}
        </div>
    );
}

export default Subscriptions;
