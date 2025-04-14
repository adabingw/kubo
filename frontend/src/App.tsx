import { useEffect, useState, createContext } from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Cookies from 'universal-cookie';

import io, { Socket } from "socket.io-client";
import { Subscription } from "./types/types";
import Stops from "./pages/Stops";
// import Trips from "./pages/Trips";
import ServiceUpdates from "./pages/ServiceUpdates";
import Main from "./pages/Main";
import Subscriptions from "./pages/Subscriptions";

const ip = import.meta.env.VITE_SERVER_IP || "34.120.108.49";
const socket: Socket = io(`http://${ip}`);
const cookie = new Cookies();
export const SocketContext = createContext<{
    socket: Socket,
    kubo_id: string | undefined,
    session: string | undefined
}>({
    socket,
    kubo_id: undefined,
    session: undefined
});

export interface SubDict {
    [k: string]: Subscription
}

function App() {
    const [subscriptions, setSubscriptions] = useState<SubDict>({});
    const [id, setId] = useState(undefined);
    const [session, setSession] = useState(undefined);
    const { pathname } = useLocation();

    const fetchSubscriptions = () => {
        if (!session) {
            console.error("Session not defined");
            return;
        }
        fetch(`http://${ip}/api/subscriptions?session=${session}`)
            .then(res => res.json())
            .then(data => {
                try {
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
        console.log(subscriptions);
    }, [subscriptions]);

    useEffect(() => {
        console.log("Session updated: ", session);
        fetchSubscriptions();
    }, [session]);

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
        socket.on("welcome", (session) => {
            console.log('connected to backend!');
            let kuboCookie = cookie.get('kubo-id');
            if (!kuboCookie) {
                // ideally: take user to login page
                kuboCookie = 'test';
                cookie.set('kubo-id', kuboCookie, { path: '/' });
            }
            console.log(kuboCookie, session);
            setId(kuboCookie);
            setSession(session);

            // establish handshake connection with backend to give user info
            fetch(`http://${ip}/api/handshake?id=${kuboCookie}&session=${session}`)
                .then(res => res.json())
                .then(data => {
                    try {
                        console.log(data)
                        if (data.message === "ACK") {
                            console.log(data);
                        } else {
                            console.error(`Error in making handshake: ${data.message}`)
                        }
                    } catch (e) {
                        console.error(`Error while parsing handshake result: ${e}`);
                    }
                });
        })
    }, [])

    const itemStyle = "my-1 py-2 cursor-pointer underline-offset-4 hover:underline decoration-[#857c6a]"

    return (
        <SocketContext.Provider value={{
            socket, kubo_id: id, session
        }}>
        <div className="w-full flex flex-row h-full">
            <div className="mr-10 w-1/5">
                <p className={`font-semibold mb-6 cursor-pointer hover:text-beige-800`}>kubo.</p>
                {/* <Link to="/trips"><p className={`${itemStyle} ${pathname === '/trips' ? 'underline' : 'no-underline'}`}>trips</p></Link> */}
                <Link to="/stops"><p className={`${itemStyle} ${pathname === '/stops' ? 'underline' : 'no-underline'}`}>stops</p></Link>
                <Link to="/subscriptions"><p className={`${itemStyle} ${pathname === '/subscriptions' ? 'underline' : 'no-underline'}`}>subscriptions</p></Link>
                <Link to="/updates"><p className={`${itemStyle} ${pathname === '/updates' ? 'underline' : 'no-underline'}`}>information updates</p></Link>
            </div>
            <div className="w-4/5 h-full">
                <Routes>
                    <Route path="/" element={<Main />}></Route>
                    <Route path="/stops" element={<Stops />}></Route>
                    {/* <Route path="/trips" element={<Trips />} /> */}
                    <Route path="/updates" element={<ServiceUpdates />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                </Routes>
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
            {/* <Dialog
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
            </Dialog> */}
        </div>
        </SocketContext.Provider>
    );
}

export default App;
