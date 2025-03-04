import { z } from 'zod';

export const StopSchema = z.object({
    stopCode: z.string(),
    stopName: z.string(),
    type: z.string(),
});

export const StopListSchema = z.array(StopSchema);

export const NextService = z.object({
    LineCode: z.string(),
    LineName: z.string(),
    ServiceType: z.string(),
    DirectionCode: z.string(),
    DirectionName: z.string(),
    ScheduledDepartureTime: z.string(),
})

export const MessageSchema = z.object({
    topic: z.string(),
    data: NextService,
    timestamp: z.string(),
    stop: StopSchema,
    next: z.string().optional()
})

export const SubSchema = z.object({
    topic: z.string(),
    stop: StopSchema,
})

export type Stop = z.infer<typeof StopSchema>
export type Message = z.infer<typeof MessageSchema>
export type StopList = z.infer<typeof StopListSchema>
export type Sub = z.infer<typeof SubSchema>
