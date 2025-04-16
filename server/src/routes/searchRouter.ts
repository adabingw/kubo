import { Router, Request, Response } from 'express';
import { get_stop_by_name } from '../utils';
import { AppContext } from '../context';

export function searchRoute(context: AppContext): Router {
    const router = Router();

    // GET /api/users - fetch all users
    router.get('/', async(req: Request, res: Response) => {
        const { query } = req.query;
        const result = await get_stop_by_name(context, query as string);
        res.status(200).json({
            query: query,
            data: result
        }).end();
    });

    return router;
}
