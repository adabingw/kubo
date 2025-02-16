import { z } from 'zod';

export type Message = {
    topic: string,
    data: string
}

export const StopSchema = z.array(z.object({
    stopCode: z.union([z.string(), z.number()]),
    stopName: z.string(),
    type: z.string(),
}));

export type Stop = z.infer<typeof StopSchema>
