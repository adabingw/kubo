import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../App";
import { Update, UpdateSchema } from "../types/alert";
import { faArrowRotateRight, faBuilding, faBus, faChevronDown, faTrain } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { line_data } from "../data/line-data";

function UpdatePage(props: {updates: Update, type: 'information' | 'service'}) {
    const { updates, type } = props;
    const [selected, setSelected] = useState<number>(-1);
    return (
        <div>
            {Object.keys(updates).length === 0 &&
                <div>no updates for {type} alerts! </div>
            }
            {Object.keys(updates).length > 0 &&
                <div>
                    {Object.keys(updates).map((key, index) => (
                        <div>
                            <div className="font-semibold mt-5 w-full flex justify-between">
                                <div>
                                    <FontAwesomeIcon color="#5c5649" icon={
                                        updates[key].type === 'stop' ? faBuilding : key.replace(/\D/g, "").length === 0 ? faTrain : faBus
                                    } />
                                    <span className="ml-5">
                                        {key} {updates[key].type === 'line' &&
                                            <span>({key.replace(/\D/g, "").length === 0 ? line_data[key] : line_data[key.replace(/\D/g, "")]})</span>
                                        }
                                    </span>
                                </div>
                                <FontAwesomeIcon icon={faChevronDown}
                                    color="#5c5649"
                                    className={`transition-transform duration-300 ${
                                        index === selected ? "rotate-180" : ""
                                    }`}
                                    onClick={() => setSelected(index === selected ? -1 : index)}
                                />
                            </div>
                            <div className={`grid transition-all duration-300 ease-in-out ${
                                index === selected ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                                } overflow-hidden`}>
                                <div className="overflow-hidden">
                                    {updates[key].messages.map((update) => (
                                        <div>
                                            <div className="font-semibold">{update.subject}</div>
                                            <div>{update.body}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                    ))}
                </div>
            }
        </div>
    )
}

function ServiceUpdates() {

    const { socket } = useContext(SocketContext);
    const [info, setInfo] = useState<Update>({});
    const [service, setService] = useState<Update>({});
    const [selected, setSelected] = useState(0);

    useEffect(() => {
        socket.on('new-information-alert', (message) => {
            console.log('info alert: ', JSON.stringify(message.data));
            setInfo(UpdateSchema.parse(typeof message.data === "string" ? JSON.parse(message.data) : message.data));
        });
    }, []);

    useEffect(() => {
        socket.on('new-service-alert', (message) => {
            console.log('service alert ', JSON.stringify(message.data))
            setService(UpdateSchema.parse(typeof message.data === "string" ? JSON.parse(message.data) : message.data));
        });
    }, []);

    const getlen = (alert: Update) => {
        return Object.values(alert).reduce((acc, alertArray) => {
            return acc + alertArray.messages.length;
        }, 0);
    }

    return (
        <div className="w-full flex flex-col mt-5">
            <div className="w-full flex flex-row items-center">
                <span className="font-semibold italic">updates</span>
                <FontAwesomeIcon icon={faArrowRotateRight} className="cursor-pointer ml-3" />
            </div>

            <div className="w-full flex gap-20 mt-5">
                <div className={`cursor-pointer ${selected === 0 ? 'border-b-2 border-[#5c5649]' : ''} pb-1`}
                    onClick={() => {
                        setSelected(0);
                    }}
                >
                    information updates
                    <span className={`ml-2 rounded-2xl bg-[#5c5649] text-white px-2`}>{getlen(info)}</span>
                </div>
                <div className={`cursor-pointer ${selected === 1 ? 'border-b-2 border-[#5c5649]' : ''} pb-1`}
                    onClick={() => {
                        setSelected(1);
                    }}
                >
                    service updates
                    <span className="ml-2 rounded-2xl bg-[#5c5649] text-white px-2">{getlen(service)}</span>
                </div>
            </div>

            <div>
                <UpdatePage
                    updates={selected === 0 ? info : service}
                    type={selected === 0 ? 'information' : 'service'}
                />
            </div>
        </div>
    );
}

export default ServiceUpdates;
