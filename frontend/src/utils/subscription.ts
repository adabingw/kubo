import { SubDict } from "../App";
import { Subscription } from "../types/types";

export const fetchSubscriptions = async (
    ip: string,
    session: string | undefined | null
): Promise<SubDict> => {
    if (!session) {
        console.error("Session not defined");
        return {};
    }

    try {
        const res = await fetch(`http://${ip}/api/subscriptions?session=${session}`);
        const data = await res.json();

        if (data.error) {
            throw data.error;
        }

        const dict: SubDict = {};
        data.forEach((sub: Subscription) => {
            const key = sub.stop.stopCode.toString();
            dict[key] = sub;
        });

        localStorage.setItem(`kubo-subscriptions`, JSON.stringify(dict));
        return dict;
    } catch (e) {
        console.error(`Error while fetching or parsing subscriptions: ${e}`);
        return {};
    }
};

