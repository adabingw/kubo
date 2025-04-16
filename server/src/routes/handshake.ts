import { Router, Request, Response } from 'express';
import { AppContext } from '../context';

export function handshakeRoute(context: AppContext): Router {
    const router = Router();

    // GET /api/users - fetch all users
    router.get('/', async(req: Request, res: Response) => {
        const { id: idVar, session: sessionVar } = req.query;
        const session = sessionVar as string;
        const id = idVar as string;
        console.log(`ACK: ${id}, ${session}`);
        if (!context.users[session]) {
            res.status(404).json({ error: "No session found."}).end();
        }

        context.users[session].id = id;
        context.userMap[id] = session;
        res.status(200).json({
            message: "ACK"
        }).end();
    });

    return router;
}
