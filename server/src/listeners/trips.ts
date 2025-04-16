import { AppContext } from "../context";
import { create_get_subscription, wipe } from "../utils";
import { Props } from "../types";
import { emitMessage } from "./emit";

const parse_trip = async (context: AppContext, props: Props) => {
    const { subscription, topic, message } = props;
    const timestamp = new Date();
    const key = `${timestamp.getTime()}-${subscription.replaceAll('/', '-')}`;

    await wipe(context, subscription.replaceAll('/', '-'));

    const messageData = {
        topic,
        type: 'trip',
        data: message.toString(),
        timestamp
    };

    const postData = {
        [key]: {
            creationDate: timestamp.getTime(),
            data: JSON.stringify(messageData.data),
            topic,
            type: 'trip'
        }
    };

    await context.refs.dataRef.set(postData, { merge: true });

    for (const session of Object.keys(context.users)) {
        emitMessage(context, session, messageData, 'new-trip');
    }
};

export const TripsListener = (context: AppContext) => {

    context.refs.subscriptionsRef.doc('trips').onSnapshot(async (doc) => {
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
                        // console.log(`Message received for trips ${inspect(data)}`);
                        parse_trip(context, {
                            subscription: subscription.name, 
                            topic, 
                            message: data, 
                            data: undefined,
                            subscribedUsers
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
