import { useEffect, useState, createContext, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBus, faCheck, faMagnifyingGlass, faTrain } from '@fortawesome/free-solid-svg-icons'
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import io, { Socket } from "socket.io-client";
import { Stop, StopList, StopListSchema, Sub } from "./types";
import { Button } from "@mui/material";
import Updates from "./Updates";
import Subscriptions from "./Subscriptions";
import { useClickOutside } from "./hooks/useClickOut";

const socket: Socket = io("http://localhost:5000");
export const SocketContext = createContext<Socket>(socket);

export interface SubDict {
    [k: string]: Sub
}

function App() {
    const [search, setSearch] = useState<StopList>([]);
    const [subscriptions, setSubscriptions] = useState<SubDict>({});
    const [query, setQuery] = useState<string>('');
    const [open, setOpen] = useState(false);
    const [selectedStop, setSelectedStop] = useState<Stop | undefined>(undefined);
    const [panel, setPanel] = useState<number>(0);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const focusedStyling = "text-[#474747] font-medium"

    const panelClick = (i: number) => {
        setPanel(i);
    }

    const handleClickOpen = (stop: Stop) => {
        setOpen(true);
        setSelectedStop(stop);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedStop(undefined);
    };

    const fetchSubscriptions = () => {
        fetch(`http://localhost:5000/api/subscriptions`)
            .then(res => res.json())
            .then(data => {
                try {
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
        console.log(subscriptions);
    }, [subscriptions])

    useEffect(() => {
        const subs = localStorage.getItem(`kubo-subscriptions`);
        if (subs) {
            try {
                setSubscriptions(JSON.parse(subs));
                console.log(`Fetched subscriptions from local storage: ${JSON.stringify(subs)}`);
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
        });
    }, []);

    useEffect(() => {
        socket.on("welcome", () => {
            console.log('connected to backend!')
        })
    }, [])

    const subscribe = () => {
        socket.emit('subscribe', selectedStop?.stopCode.toString());
        handleClose();
    }

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

    const { clickOutside, setClickOutside } = useClickOutside(dropdownRef, inputRef);

    return (
        <SocketContext.Provider value={socket}>
        <div className="w-full">
            <h1>kubo.</h1>
            <div className="form-group mt-3 text-[#99A3BA]">
                <span>search GO stop</span>
                <input 
                    className="form-field" type="text" ref={inputRef}
                    placeholder="ie: union" onInput={onSearchInput} onKeyDown={onSearchKeyDown}
                    onFocus={() => setClickOutside(false)}
                />
                <span className="w-15"><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
            </div>
            {search && query.length >= 3 && !clickOutside ?
                <div 
                ref={dropdownRef}
                className={`ml-30 min-w-100 absolute z-1000 bg-white flex flex-col border-l-1 border-b-1 border-r-1 border-gray-300 rounded-b-sm pt-10`}>
                    {(search && search.length > 0) ? 
                        <>
                            {search.map((stop) => (
                            <div key={stop.stopCode} 
                                onClick={() => {
                                    if (subscriptions[stop.stopCode]) {
                                        toast(`Already subscribed to ${subscriptions[stop.stopName]}. Manage your subscriptions in Subscriptions.`);
                                    } else {
                                        handleClickOpen(stop);
                                    }
                                }}
                                className="flex flex-row items-center justify-between py-1 px-2 hover:bg-gray-300 hover:cursor-pointer">
                                <div className="flex flex-row">
                                    <span className="w-6 flex items-center flex-row justify-center ml-3">
                                        {stop.type.toLowerCase().includes('train') ? 
                                            <FontAwesomeIcon icon={faTrain} /> : <FontAwesomeIcon icon={faBus} />
                                        }
                                    </span>
                                    <span className="ml-1">{stop.stopName}</span>  
                                </div>
                                {subscriptions[stop.stopCode] && 
                                    <FontAwesomeIcon icon={faCheck} className="mr-3" />
                                }
                            </div>
                        ))}
                        </> : (query.length > 0) ? 
                            <span>No results</span> : <></>
                    }
                </div> : <></>
            }

            <div className="mt-5 flex justify-center">
                <div className="w-full flex justify-center flex-col items-center">
                <div className="form-group cursor-pointer flex justify-center">
                    <span onClick={() => panelClick(0)} 
                        className={`${panel==0 ? `${focusedStyling}` : 'text-[#99A3BA]'}`}>updates</span>
                    <span onClick={() => panelClick(1)} 
                        className={`${panel==1 ? `${focusedStyling}` : 'text-[#99A3BA]'}`}>subscriptions</span>
                </div>
                <div className="w-full">
                    {panel == 0 ? <Updates /> : <Subscriptions />}
                </div>
            </div>
            </div>    
            <ToastContainer 
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                {`Subscribe to ${selectedStop?.stopName}?`}
                </DialogTitle>
                <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    Subscribe to {selectedStop?.stopName} and get updates on all its services?
                </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={subscribe}>Sure</Button>
                    <Button onClick={handleClose}>Nah</Button>
                </DialogActions>
            </Dialog>
        </div>
        </SocketContext.Provider>
    );
}

export default App;
