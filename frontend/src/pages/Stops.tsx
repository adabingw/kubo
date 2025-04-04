import { useContext, useEffect, useRef, useState } from "react";
import { StopList, StopListSchema, Sub } from "../types/types";
import { faBus, faMagnifyingGlass, faTrain } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SubDict, SocketContext } from "../App";
import Rating from '@mui/material/Rating';
import { Tooltip } from "@mui/material";
import { styled } from '@mui/material/styles';

const StyledRating = styled(Rating)({
    '& .MuiRating-iconFilled': {
      color: '#5c5649',
    },
    '& .MuiRating-iconHover': {
      color: '#5c5649',
    },
});

function Stops() {

    const [search, setSearch] = useState<StopList | undefined>([]);
    const [subscriptions, setSubscriptions] = useState<SubDict>({});
    const { socket, session } = useContext(SocketContext);
    const ip = import.meta.env.VITE_SERVER_IP || "34.120.108.49";
    
    const inputRef = useRef<HTMLInputElement>(null);

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
    }, []);

    useEffect(() => {
        socket.on('subscribe-success', () => {
            fetchSubscriptions();
        })
    }, []);

    const makeSearch = (v: string) => {
        const storage = localStorage.getItem(`kubo-${v}`);
        console.log('storage: ', storage);
        if (storage) {
            try {
                const stopData = StopListSchema.parse(JSON.parse(storage));
                setSearch(stopData);
                return;
            } catch (e) {
                console.error(`Error parsing JSON: ${e}`);
            }
        }
        fetch(`http://${ip}/api/search?query=${v}`)
            .then(res => res.json())
            .then(data => {
                try {
                    console.log(data);
                    localStorage.setItem(`kubo-${data.query}`, JSON.stringify(data.data));
                    setSearch(data.data.length > 0 ? data.data : undefined);
                } catch (e) {
                    console.error(`Error while parsing search result: ${e}`);
                }
            });
    }

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && e.currentTarget.value.length >= 3) {
            makeSearch(e.currentTarget.value);
        }
    }

    const onClick = (subscribed: boolean, stopCode: string) => {
        if (subscribed) {
            socket.emit("unsubscribe", {
                stopCode,
                session
            });
        } else {
            socket.emit('subscribe', {
                stopCode,
                session
            });
        }
    }

    return (
        <div className="w-full flex flex-col mt-5">
            <div className="font-semibold italic">search go stop</div>
            <div className="mt-3 text-[#5c5649] w-full">
                <span className="w-15"><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
                <input 
                    className="ml-5 w-9/10 border-b-1" type="text" ref={inputRef}
                    placeholder="ie: union" onKeyDown={onSearchKeyDown}
                />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 mt-10 gap-y-5 gap-x-3">
                {search && search.map((stop) => (
                    <div key={stop.stopCode} className="border-1 border-[#5c5649] border-t-2 p-5 w-60">
                        <div className="flex justify-between">
                            <div>
                                {stop.type.toLowerCase().includes('train') ? 
                                    <FontAwesomeIcon icon={faTrain} /> : <FontAwesomeIcon icon={faBus} />
                                }
                                <span className="pl-3">{stop.type}</span>
                            </div>
                            <Tooltip 
                                title={subscriptions[stop.stopCode.toString()] ? "unsubscribe" : "subscribe"} 
                                placement="top" arrow
                            >
                                <StyledRating defaultValue={subscriptions[stop.stopCode.toString()] ? 1 : 0} max={1} 
                                    onClick={() => onClick(!!subscriptions[stop.stopCode.toString()], stop.stopCode)}
                                />
                            </Tooltip>
                        </div>
                        <div className="font-semibold">{stop.stopName}</div>
                        <div>Stop ID: {stop.stopCode}</div>
                    </div>
                ))}
                {search === undefined && 
                    <div>No search results rah</div>
                }
            </div>
        </div>
    );
}

export default Stops;
