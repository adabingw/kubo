// gets the pubsub subscription or creates one if it doesn't exist
const create_get_subscription = async (pubsub, sub) => {
    try {
        const [subscription] = await pubsub.topic(sub).createSubscription(sub);
        console.log(`Subscription ${sub} created.`);
        return subscription;
    } catch (error) {
        if (error.code === 6) {
            console.log(`Subscription ${sub} already exists.`);
            const subscription = pubsub.subscription(sub);
            return subscription;
        } else if (error.code === 5) {
            console.error('Topic has not been created yet');
            createTopic(sub);
        } else {
            console.error("Error creating subscription:", error);
            return null;
        }
    }
}

const create_topic = async (pubsub, topicName) => {
    "use strict";    
    try {
        const [topic] = await pubsub.createTopic(topicName);
        console.log(`Topic created: ${topic.name}`);
        return { success: true, message: `Topic created: ${topic.name}` };
    } catch (error) {
        console.error(`Error creating topic: ${error.message}`);
        return { success: false, message: error.message };
    }
}

const get_topic = async (pubsub, topicName) => {
    try {
        const [topic] = await pubsub.topic(topicName).get({ autoCreate: false });
        return true;
    } catch (error) {
        if (error.code === 5) { // NOT_FOUND
            return false;
        }
        throw error;
    }
}

module.exports = {
    create_get_subscription,
    create_topic,
    get_topic
}
