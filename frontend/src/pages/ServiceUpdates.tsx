import { useContext, useEffect, useMemo, useState } from "react";
import { SocketContext } from "../App";
import { Update, UpdateSchema } from "../types/alert";
import { faArrowRotateRight, faBolt, faBuilding, faBus, faChevronDown, faClockRotateLeft, faFire, faTrain, faTrainTram, faWrench, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { line_data } from "../data/line-data";

function UpdatePage(props: {updates: Update, type: 'information' | 'service'}) {
    const { updates: updateProps, type } = props;
    const [selected, setSelected] = useState<number>(-1);
    const [filter, setFilter] = useState<'bus' | 'train' | 'station' | undefined>(undefined);
    const [counts, setCounts] = useState<{
        train: number,
        bus: number,
        station: number
    }>({
        train: 0,
        bus: 0,
        station: 0
    });

    const icon_map: Record<string, IconDefinition> = {
        "General Information": faCircleQuestion,
        "Service Disruption": faClockRotateLeft,
        "Amenity": faWrench,
        "UP Express Station Messages": faTrainTram,
        "Disruptions": faBolt
    };

    useEffect(() => {
        setSelected(-1);
        setFilter(undefined);
        const count = {
            train: 0,
            bus: 0,
            station: 0
        }

        Object.keys(updateProps).forEach((key) => {
            if (updateProps[key].type === 'stop') count.station += 1;
            else {
                const code = key.replace(/\D/g, "");
                if (code.length === 0) count.train += 1;
                else count.bus += 1;
            }
        });
        setCounts(count);
    }, [updateProps]);

    const updates: Update = useMemo(() => {
        setSelected(-1);
        if (!filter) return updateProps;
    
        return Object.keys(updateProps).reduce((acc, key) => {
            const item = updateProps[key];
            if (filter === 'station' && item.type === 'stop') {
                acc[key] = item;
            } else {
                const code = key.replace(/\D/g, "");
                if (item.type === 'line' && (filter === 'train' && code.length === 0) || (filter === 'bus' && code.length !== 0)) {
                    acc[key] = item;
                }
            }
            return acc;
        }, {} as Update);
    }, [filter, updateProps]);

    return (
        <div>
            {Object.keys(updates).length === 0 &&
                <div className="flex justify-center mt-10">no updates for {type} alerts! </div>
            }
            {Object.keys(updates).length > 0 &&
                <div>
                    <div className="flex flex-row mt-10 w-full justify-center gap-5">
                        <span className={`border border-beige-300 rounded-full px-2 py-1 cursor-pointer hover:bg-beige-100 ${filter === undefined ? 'bg-beige-100' : ''}`}
                            onClick={() => {
                                setFilter(undefined);
                            }}
                        >
                            <FontAwesomeIcon icon={faFire} size="sm" color="#5c5649" />
                            <span className="ml-3">
                                view all
                            </span>
                        </span>
                        <span className={`border border-beige-300 rounded-full px-2 py-1
                            ${filter === 'bus' ? 'bg-beige-100' : ''}
                            ${counts.bus !== 0 ? 'hover:bg-beige-100 cursor-pointer' : 'cursor-not-allowed' }
                        `}
                            onClick={() => {
                                if (counts.bus === 0) return;
                                setFilter('bus');
                            }}
                        >
                            <FontAwesomeIcon icon={faBus} size="sm" color={counts.bus === 0 ? "#9c9c9c" : "#5c5649"} />
                            <span className={`ml-3 ${counts.bus === 0 ? "text-gray-600" : "text-black"}`}>
                                bus
                            </span>
                        </span>
                        <span className={`border border-beige-300 rounded-full px-2 py-1
                            ${filter === 'train' ? 'bg-beige-100' : ''}
                            ${counts.train !== 0 ? 'hover:bg-beige-100 cursor-pointer' : 'cursor-not-allowed' }
                        `}
                            onClick={() => {
                                if (counts.train === 0) return;
                                setFilter('train');
                            }}
                        >
                            <FontAwesomeIcon icon={faTrain} size="sm" color={counts.train === 0 ? "#9c9c9c" : "#5c5649"} />
                            <span className={`ml-3 ${counts.train === 0 ? "text-gray-600" : "text-black"}`}>
                                train
                            </span>
                        </span>
                        <span className={`border border-beige-300 rounded-full px-2 py-1 cursor-pointer 
                            ${filter === 'station' ? 'bg-beige-100' : ''}
                            ${counts.station !== 0 ? 'hover:bg-beige-100 cursor-pointer' : 'cursor-not-allowed' }
                        `}
                            onClick={() => {
                                if (counts.station === 0) return;
                                setFilter('station');
                            }}
                        >
                            <FontAwesomeIcon icon={faBuilding} size="sm" color={counts.station === 0 ? "#9c9c9c" : "#5c5649"} />
                            <span className={`ml-3 ${counts.station === 0 ? "text-gray-600" : "text-black"}`}>
                                station
                            </span>
                        </span>
                    </div>
                    {Object.keys(updates).map((key, index) => (
                        <div key={`key-${index}`}>
                            <div className="font-semibold mt-5 w-full flex justify-between items-center rounded-md border hover:border-beige-300 px-3 py-1"
                                onClick={() => setSelected(index === selected ? -1 : index)}
                            >
                                <div className="flex flex-row items-center justify-start">
                                    <FontAwesomeIcon size="lg" color="#5c5649" icon={
                                        updates[key].type === 'stop' ? faBuilding : key.replace(/\D/g, "").length === 0 ? faTrain : faBus
                                    } />
                                    <h3 className="ml-5">
                                        {key} {updates[key].type === 'line' &&
                                            <span>({key.replace(/\D/g, "").length === 0 ? line_data[key] : line_data[key.replace(/\D/g, "")]})</span>
                                        }
                                    </h3>
                                </div>
                                <FontAwesomeIcon icon={faChevronDown}
                                    size="sm"
                                    color="#5c5649"
                                    className={`transition-transform duration-300 ${
                                        index === selected ? "rotate-180" : ""
                                    }`}
                                />
                            </div>
                            <div className={`w-full grid transition-all duration-300 ease-in-out ${
                                index === selected ? "grid-rows-[1fr] opacity-100 p-3 pt-5" : "grid-rows-[0fr] opacity-0 p-0"
                            } overflow-hidden bg-beige-100`}>
                                <div className={`overflow-hidden w-full`}>
                                    {updates[key].messages.map((update, index) => (
                                        <div className={`w-full flex flex-row ${index !== 0 ? "border-t-1 border-beige-300 mt-3 pt-3": ""}`} key={`${index}`}>
                                            <div className="w-1/7 flex justify-center items-start mt-3">
                                                <FontAwesomeIcon icon={icon_map[update.category] ? icon_map[update.category] : faCircleQuestion}
                                                    color="#5c5649"
                                                    size="lg"
                                                />
                                            </div>
                                            <div className="w-6/7 flex flex-col">
                                                <div className="font-semibold">{update.subject}</div>
                                                <div>{update.body}</div>
                                            </div>
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
            console.log('info alert: ');
            const messageJSON = typeof message === "string" ? JSON.parse(message) : message;
            let data = messageJSON.data;
            while (typeof data === "string") {
                data = JSON.parse(data);
            }
            setInfo(UpdateSchema.parse(data));
        });
    }, []);

    useEffect(() => {
        socket.on('new-service-alert', (message) => {
            console.log('service alert ')
            const messageJSON = typeof message === "string" ? JSON.parse(message) : message;
            let data = messageJSON.data;
            while (typeof data === "string") {
                data = JSON.parse(data);
            }
            setService(UpdateSchema.parse(data));
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
