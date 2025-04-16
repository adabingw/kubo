import { Router, Request, Response } from 'express';
import { AppContext } from '../context';
import { get_stop_by_stopcode } from '../utils';

export function subscriptionsRoute(context: AppContext): Router {
    const router = Router();

    // GET /api/users - fetch all users
    router.get('/', async(req: Request, res: Response) => {
        try {
            const { session: sessionVar } = req.query;
            const session = sessionVar as string;
    
            // console.log(session, users);
    
            if (!context.users[session]) {
                return res.status(404).json({ error: "No session found."}).end();
            }
    
            // get user doc from firestore
            const userId = context.users[session].id;
            const doc = await context.db.collection("users").doc(userId).get();
            
            if (!doc.exists) {
                console.error("No such document!");
                return res.status(404).json({ error: "Error: document not found" });
            }
    
            const data = doc.data();
            const stops = data.stops || [];
    
            const result = await Promise.all(
                stops.map(async (stop) => ({
                    topic: stop,
                    stop: await get_stop_by_stopcode(context, stop.split('-')[1]),
                }))
            );
    
            return res.status(200).json(result).end();
        } catch (error) {
            console.error("Error getting subscriptions:", error);
            return res.status(500).json({ error: `Error: ${error.message}` }).end();
        }
    });

    return router;
}
