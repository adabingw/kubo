import { z } from "zod";
import { StopSchema } from "./stops";

// ---- Stop Schema ----
const stopSchema = z.object({
    Code: z.string(),
    Order: z.number(),
    Time: z.string(),
    sortingTime: z.string(),
    IsMajor: z.boolean(),
});

// ---- Trip Schema ----
const TripSchema = z.object({
    display: z.string(),
    line: z.string(),
    lineVariant: z.string(),
    type: z.string(),
    Stops: z.object({
        Stop: z.array(stopSchema),
    }),
    destinationStopCode: z.string(),
    departFromCode: z.string(),
    departFromAlternativeCode: z.string(),
    departFromTimingPoint: z.string(),
    tripPatternId: z.union([z.string(), z.number()]),
});

// ---- Transfer Schema ----
const transferSchema = z.object({
  Code: z.string(),
  Order: z.number(),
  Time: z.string(),
});

// ---- Transfer Link Schema ----
const transferLinkSchema = z.object({
    FromTrip: z.string(),
    FromStopCode: z.string(),
    ToTrip: z.string(),
    ToStopCode: z.string(),
    TransferDuration: z.string(),
});

const ServiceSchema = z.object({
    type: z.enum(['R', 'B', 'RB']),
    startTime: z.string(),
    endTime: z.string(),
    duration: z.string(),
    trips: z.array(TripSchema),
    transfers: z.array(transferSchema),
    link: z.array(transferLinkSchema),
    transferCount: z.number(),
});

export const JourneySchema = z.object({
    From: StopSchema,
    Journey: z.object({
        To: StopSchema,
        Services: z.union([z.array(ServiceSchema), z.null()])
    })
});

export type Journey = z.infer<typeof JourneySchema>;
