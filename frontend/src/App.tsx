import { useEffect, useState, createContext } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBus, faMagnifyingGlass, faTrain } from '@fortawesome/free-solid-svg-icons'

import io, { Socket } from "socket.io-client";
import { Stop, StopList, StopListSchema, SubListSchema } from "./types";
import Board from "./Board";

const socket: Socket = io("http://localhost:5000");
export const SocketContext = createContext<Socket>(socket);

interface SubDict {
    [k: string]: Stop
}

function App() {
    const [search, setSearch] = useState<StopList>([]);
    const [subscriptions, setSubscriptions] = useState<SubDict>({});
    const [query, setQuery] = useState<string>('');

    const fetchSubscriptions = () => {
        fetch(`http://localhost:5000/api/subscriptions`)
            .then(res => res.json())
            .then(data => {
                try {
                    const result = SubListSchema.parse(JSON.parse(data));
                    localStorage.setItem(`kubo-subscriptions`, JSON.stringify(result));
                    const dict: SubDict = {}
                    result.forEach(sub => {
                        const key = sub.stop.stopCode.toString();
                        dict[key] = sub.stop
                    })
                    setSubscriptions(dict);
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

    useEffect(() => {
        socket.on("welcome", () => {
            console.log('connected to backend!')
        })
    }, [])

    const makeSearch = (v: string) => {
        const storage = localStorage.getItem(`kubo-${v}`);
        console.log('storage: ', storage);
        if (storage) {
            try {
                const stopData = StopListSchema.parse(JSON.parse(storage));
                console.log('stopData: ', stopData)
                setSearch(stopData);
                return;
            } catch (e) {
                console.error(`Error parsing JSON: ${e}`);
            }
        }
        fetch(`http://localhost:5000/api/search?query=${v}`)
            .then(res => res.json())
            .then(data => {
                try {
                    const result = JSON.parse(data);
                    console.log(result);
                    localStorage.setItem(`kubo-${result.query}`, JSON.stringify(result.data));
                    setSearch(result.data);
                } catch (e) {
                    console.error(`Error while parsing search result: ${e}`);
                }
            });
    }

    const onSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
        if (e.currentTarget.value.length === 0) {
            setQuery('');
            setSearch([]);
        }
        if (e.currentTarget.value.length >= 3) {
            setQuery(e.currentTarget.value.trimEnd().trimStart());
            makeSearch(e.currentTarget.value);
        }
    }

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && e.currentTarget.value.length >= 3) {
            makeSearch(e.currentTarget.value);
        }
    }

    return (
        <SocketContext.Provider value={socket}>
        <div className="w-full ">
            <h1>kubo.</h1>
            <div className="form-group mt-3 text-[#99A3BA]">
                <span>search GO stop</span>
                <input className="form-field" type="text" placeholder="ie: union" onInput={onSearchInput} onKeyDown={onSearchKeyDown}/>
                <span className="w-15"><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
            </div>
            {search && query ? 
                <div className={`ml-30 min-w-100 absolute bg-white flex flex-col border-l-1 border-b-1 border-r-1 border-gray-300 rounded-b-sm pt-10`}>
                    {(search && search.length > 0) ? 
                        <>
                            {search.map((stop) => (
                            <div key={stop.stopCode} className="flex flex-row py-1 px-2 hover:bg-gray-300 hover:cursor-pointer">
                                <span className="w-6 flex items-center flex-row justify-center ml-3">
                                {stop.type.toLowerCase().includes('train') ? 
                                    <FontAwesomeIcon icon={faTrain} /> : <FontAwesomeIcon icon={faBus} />
                                }
                                </span>
                                <span className="ml-1">{stop.stopName}</span>  
                            </div>
                        ))}
                        </> : (query.length > 0) ? 
                            <span>No results</span> : <></>
                    }
                </div> : <></>
            }

            <div className="mt-5 flex justify-center">
                <Board />
            </div>    
        </div>
        </SocketContext.Provider>
    );
}

export default App;
