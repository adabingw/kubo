
// mapping of item to topic id for pub sub
// stops have a stopCode: topic id
// service and information are global topics subscribed by every user
interface Subscriptions {
    stops: StopSubscription,
    service: string,
    information: string
}

interface StopSubscription {
    [key: string]: string; // key is stop code
}
