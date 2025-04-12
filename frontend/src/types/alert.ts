import { z } from "zod";

export const AlertSchema = z.object({
    Code: z.string(),
    ParentCode: z.string().nullable(),
    Status: z.string(),
    PostedDateTime: z.string(),
    SubjectEnglish: z.string(),
    SubjectFrench: z.string(),
    BodyEnglish: z.string(),
    BodyFrench: z.string().nullable(),
    Category: z.string(),
    SubCategory: z.string(),
    Lines: z.array(
        z.object({
        Code: z.string(),
        })
    ),
    Stops: z.array(
        z.object({
        Name: z.string().nullable(),
        Code: z.string(),
        })
    ),
    Trips: z.array(z.any()), // Replace z.any() with a specific schema if needed
});
export const AlertListSchema = z.array(AlertSchema);

export const UpdateSchema = z.record(z.string(), z.object({
    type: z.enum(['stop', 'line']),
    stops: z.union([z.object({
        stopCode: z.string(),
        stopName: z.string()
    }), z.undefined()]),
    lines: z.union([z.string(), z.undefined()]),
    messages: z.array(z.object({
        subject: z.string(),
        body: z.string(),
        category: z.string(),
        subcategory: z.string(),
    }))
}));

export type Alert = z.infer<typeof AlertSchema>;
export type AlertList = z.infer<typeof AlertListSchema>;
export type Update = z.infer<typeof UpdateSchema>;
