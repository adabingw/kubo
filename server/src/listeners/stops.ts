import { AppContext } from "../context";
import { get_stop_by_stopcode, create_get_subscription, wipe } from "../utils";
import { Props } from "../types";
import { emitMessage } from "./emit";

const parse_stop = async (context: AppContext, props: Props) => {
    const { subscription, topic, message, subscribedUsers, data } = props;
    const stopCode = data.params.stopCode;

    const stop = await get_stop_by_stopcode(context, stopCode);
    const timestamp = new Date();
    const key = `${timestamp.getTime()}-${subscription.replaceAll('/', '-')}`;

    await wipe(context, subscription.replaceAll('/', '-'));

    const messageData = {
        topic,
        type: 'stop',
        data: message.toString(),
        timestamp,
        stop: JSON.stringify(stop)
    };

    const postData = {
        [key]: {
            creationDate: timestamp.getTime(),
            data: JSON.stringify(messageData.data),
            topic,
            type: 'stop'
        }
    };

    await context.refs.dataRef.set(postData, { merge: true });

    for (const user of subscribedUsers) {
        const session = context.userMap[user];
        if (session) {
            emitMessage(context, session, messageData, `new-${topic}`);
        }
    }
};


export const StopsListener = (context: AppContext) => {
    context.refs.subscriptionsRef.doc('stops').onSnapshot(async (doc) => {
        if (doc.exists) {
            // doc data should be of form topic: string, users: string[]
            const data = doc.data();
    
            for (const [topic, v] of Object.entries(data)) {
                // console.log("Subscription data changed: ", topic, v);
                const subscribedUsers = v.users;
            
                const subscription = await create_get_subscription(context, topic);
                if (subscription) {
                    subscription.on("message", async message => {
                        const data = message.data.toString('utf8');
                        // console.log(`Message received for stops ${inspect(data)}`);
                        parse_stop(context, {
                            subscription: subscription.name,  
                            data: v, 
                            message: data, 
                            subscribedUsers,
                            topic
                        });
                        message.ack();
                    });
                }
            }
        } else {
            console.error("Data doesn't exist.");
        }
    });
}
