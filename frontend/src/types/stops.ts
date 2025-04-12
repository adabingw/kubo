import { z } from "zod";

export const StopSchema = z.object({
    stopCode: z.string(),
    stopName: z.string(),
    type: z.string(),
});

export const StopListSchema = z.array(StopSchema);

export type Stop = z.infer<typeof StopSchema>
export type StopList = z.infer<typeof StopListSchema>
