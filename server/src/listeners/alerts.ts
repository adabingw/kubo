import { AppContext } from "../context";
import { get_stop_by_stopcode, create_get_subscription, wipe } from "../utils";
import { AlertDataType, Props } from "../types";
import { emitMessage } from "./emit";

const parse_alert = async (context: AppContext, props: Props) => {
    const { subscription, message, topic } = props;
    const parsedData: Record<string, AlertDataType> = {};

    await wipe(context, subscription.replaceAll('/', '-'));
    const messages = typeof message === 'string' ? JSON.parse(message) : message;

    const baseData = {
        type: 'stop' as const,
        stops: null,
        lines: null,
        messages: [] as any[]
    };

    for (const msg of messages) {
        const { Category, SubCategory, SubjectEnglish, BodyEnglish, Stops, Lines } = msg;
        const messageData = {
            subject: SubjectEnglish,
            body: BodyEnglish,
            category: Category,
            subcategory: SubCategory,
        };

        if (Category === "Amenity" || SubCategory === "Station General Information") {
            for (const { Code: stopCode } of Stops) {
                const stopName = (await get_stop_by_stopcode(context, stopCode)).stopName;
                parsedData[stopName] ??= {
                    ...structuredClone(baseData),
                    stops: { stopCode, stopName },
                };
                parsedData[stopName].messages.push(messageData);
            }
        } else {
            for (const { Code: lineCode } of Lines) {
                parsedData[lineCode] ??= {
                    ...structuredClone(baseData),
                    type: 'line',
                    lines: lineCode,
                };
                parsedData[lineCode].messages.push(messageData);
            }
        }
    }

    const timestamp = new Date();
    const key = `${timestamp.getTime()}-${subscription.replaceAll('/', '-')}`;
    const messageData = {
        topic,
        type: topic,
        data: JSON.stringify(parsedData),
        timestamp,
    };

    await context.refs.dataRef.set({
        [key]: {
            creationDate: timestamp.getTime(),
            data: messageData.data,
            topic,
            type: topic
        }
    }, { merge: true });

    for (const session in context.users) {
        emitMessage(context, session, messageData, `new-${topic}`);
    }
};


export const AlertsListener = async(context: AppContext) => {
    // doc data should be of form topic: string, users: string[]
    const infoSubscription = await create_get_subscription(context, 'information-alert');
    if (infoSubscription) {
        infoSubscription.on("message", async message => {
            const data = message.data.toString('utf8');
            // console.log(`Message received for info alert ${inspect(data)}`);
            parse_alert(context, {
                subscription: infoSubscription.name, 
                topic: 'information-alert', 
                message: data, 
                data: undefined,
                subscribedUsers: []});
            message.ack();
        });
    }

            // doc data should be of form topic: string, users: string[]
    const serviceSubscription = await create_get_subscription(context, 'service-alert');
    if (serviceSubscription) {
        serviceSubscription.on("message", async message => {
            const data = message.data.toString('utf8');
            // console.log(`Message received for service alert ${inspect(data)}`);
            parse_alert(context, {
                subscription: serviceSubscription.name, 
                topic: 'service-alert', 
                message: data, 
                data: undefined,
                subscribedUsers: []});
            message.ack();
        });
    }
}
