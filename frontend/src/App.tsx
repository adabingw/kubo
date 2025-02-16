import { useEffect, useState, createContext } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBus, faMagnifyingGlass, faTrain } from '@fortawesome/free-solid-svg-icons'

import io, { Socket } from "socket.io-client";
import { Stop, StopSchema } from "./types";
import Board from "./Board";

const socket: Socket = io("http://localhost:5000");
export const SocketContext = createContext<Socket>(socket);

function App() {
    const [search, setSearch] = useState<Stop>([]);
    const [query, setQuery] = useState<string>('');

    useEffect(() => {
        socket.on("search-result", (msg: string) => {
            try {
                const result = JSON.parse(msg);
                console.log(result);
                localStorage.setItem(`kubo-${result.query}`, JSON.stringify(result.data));
                setSearch(result.data);
            } catch (e) {
                console.error(`Error while parsing search result: ${e}`);
            }
            
        });
    
        socket.on("welcome", () => {
            console.log('hit!')
        })
    }, [])

    const makeSearch = (v: string) => {
        const storage = localStorage.getItem(`kubo-${v}`);
        console.log('storage: ', storage);
        if (storage) {
            try {
                const stopData = StopSchema.parse(JSON.parse(storage));
                console.log('stopData: ', stopData)
                setSearch(stopData);
                return;
            } catch (e) {
                console.error(`Error parsing JSON: ${e}`);
            }
        }
        socket.emit('search', v);
    } 

    useEffect(() => {
        console.log(query, search)
    }, [query, search])

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
                            <span>rip nothing found</span> : <></>
                    }
                </div> : <></>
            }

            <div className="mt-5 flex justify-center">
                <Board />
            </div>    

            {/* {(messages.length > 0) ? 
                <>{messages.map((msg: Message, idx) => (
                    <div key={idx}>
                        <strong>{msg.topic}:</strong> {msg.data}
                    </div>
                ))}</> : <p>subscribe to stops to start seeing its updates!!</p>
            } */}
        </div>
        </SocketContext.Provider>
    );
}

export default App;
