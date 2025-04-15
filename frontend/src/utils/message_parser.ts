import { NextServiceSchema } from "../types/next_service";
import { StopSchema } from "../types/stops";
import { Message } from "../types/types";


interface MessageProps {
    topic: string,
    data: string,
    timestamp: string,
    stop: string
}

export const message_parser = (msgs: MessageProps, prevMessages: Message[] | undefined): Message[] => {
    const { topic, data: dataString, timestamp, stop: stop_ } = msgs;
    const newMessages = [...prevMessages || []];
    const messagesMap: Record<string, Message> = {};
    // for storage purposes
    const messageStorage: Record<string, Message[]> = {};
    const dataJSON = typeof dataString === "string" ? JSON.parse(dataString) : dataString;

    for (const data of dataJSON) {
        const parsedData = NextServiceSchema.parse(data);
        const stop = StopSchema.parse(JSON.parse(stop_));
        const key = `${stop.stopCode}-${parsedData.LineCode}`;

        // if the train/bus already left, ignore this data
        if (Date.now() >= new Date(parsedData.ScheduledDepartureTime).getTime()) continue;

        const message = {
            topic: topic,
            data: parsedData,
            timestamp: timestamp,
            stop: stop
        };
        
        // store all future services
        if (!messageStorage[key]) {
            messageStorage[key] = [message];
        } else {
            messageStorage[key].push(message);
        }

        messageStorage[key].sort((a,b) => 
            new Date(a.data.ScheduledDepartureTime).getTime() 
            - new Date(b.data.ScheduledDepartureTime).getTime())
        localStorage.setItem(`kubo-data-${key}`, JSON.stringify(messageStorage[key]));

        // initiate data if it does't exist
        if (!messagesMap[key]) {
            messagesMap[key] = message;
        // if there's no next service, set this as next service
        } else if (!messagesMap[key].next) {
            const nextTime = 
                new Date(parsedData.ScheduledDepartureTime) > 
                new Date(messagesMap[key].data.ScheduledDepartureTime)
            if (nextTime) messagesMap[key].next = parsedData.ScheduledDepartureTime;
        // if there is next service but it's after current, set current as next service
        } else if (messagesMap[key].next != undefined) {
            const nextTime = 
                new Date(parsedData.ScheduledDepartureTime) > 
                new Date(messagesMap[key].data.ScheduledDepartureTime) && 
                new Date(parsedData.ScheduledDepartureTime) < 
                new Date(messagesMap[key].next || '')
            if (nextTime) messagesMap[key].next = parsedData.ScheduledDepartureTime;
        }
    }

    // filter out old messages of this stopcode and linecode
    const filteredMessages = newMessages.filter(
        (msg) => !messagesMap[`${msg.stop.stopCode}-${msg.data.LineCode}`]
    );
    
    filteredMessages.push(...Object.values(messagesMap));
    const messagesData = prune_data(filteredMessages);            
    localStorage.setItem(`kubo-messages-${topic}`, JSON.stringify(messagesData));
    return messagesData;
}

    // go thru all messages and update old messages with new messages
export const prune_data = (data: Message[]): Message[] => {
    const result = [...data];
    for (let i = result.length - 1; i >= 0; i--) {
        const res = result[i];
        const storage = localStorage.getItem(`kubo-data-${res.stop.stopCode}-${res.data.LineCode}`);
        if (storage) {
            const dataJSON = JSON.parse(storage) as Message[];
            if (Array.isArray(dataJSON) && dataJSON.length >= 1) {
                const service = dataJSON.splice(0, 1)[0];
            }
        }

        if (new Date(res.data.ScheduledDepartureTime).getTime() <= Date.now()) {
            // get new message
            const key = `kubo-data-${res.stop.stopCode}-${res.data.LineCode}`;
            const storage = localStorage.getItem(key);
            if (!storage) {
                result.splice(i, 1);
            } else {
                const dataJSON = JSON.parse(storage) as Message[];
                let splindex = -1;
                for (let j = 0; j < dataJSON.length; j++) {
                    const d = dataJSON[j];
                    if (new Date(d.data.ScheduledDepartureTime).getTime() > Date.now()) {
                        result[i] = d;
                        splindex = j;
                    }
                }
                if (splindex !== -1 && dataJSON.length > splindex + 1) {
                    const nextService = dataJSON[splindex + 1];
                    result[i].next = nextService.data.ScheduledDepartureTime;
                }
                localStorage.setItem(key, JSON.stringify(splindex !== -1 ? dataJSON.splice(splindex) : dataJSON));
            }
        }
    }
    return result;
}

