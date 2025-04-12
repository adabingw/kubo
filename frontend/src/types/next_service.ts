import { z } from "zod";

export const NextServiceSchema = z.object({
    LineCode: z.string(),
    LineName: z.string(),
    ServiceType: z.string(),
    DirectionCode: z.string(),
    DirectionName: z.string(),
    ScheduledDepartureTime: z.string(),
});

export type NextService = z.infer<typeof NextServiceSchema>;
