import { z } from 'zod';
import { StopSchema } from './stops';
import { NextServiceSchema } from './next_service';

export const MessageSchema = z.object({
    topic: z.string(),
    data: NextServiceSchema,
    timestamp: z.string(),
    stop: StopSchema,
    next: z.string().optional()
})

export const SubSchema = z.object({
    topic: z.string(),
    stop: StopSchema,
})

export type Message = z.infer<typeof MessageSchema>
export type Sub = z.infer<typeof SubSchema>
