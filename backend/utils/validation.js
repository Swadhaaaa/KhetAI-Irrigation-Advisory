const { z } = require("zod");

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD.").refine(
    (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
    "Expected a valid calendar date."
);

const coordinate = (min, max) => z.coerce.number().finite().min(min).max(max);

const registrationSchema = z.object({
    name: z.string().trim().min(1).max(120),
    mobile: z.string().trim().regex(/^\d{10,15}$/, "Mobile number must contain 10 to 15 digits."),
    password: z.string().min(8).max(128),
    village: z.string().trim().max(120).optional().default(""),
    taluk: z.string().trim().max(120).optional().default(""),
    district: z.string().trim().max(120).optional().default(""),
});

const loginSchema = z.object({
    mobile: z.string().trim().regex(/^\d{10,15}$/),
    password: z.string().min(1).max(128),
});

const plotSchema = z.object({
    name: z.string().trim().min(1).max(160),
    area: z.coerce.number().finite().positive().max(100000),
    crop: z.string().trim().min(1).max(80).optional().default("Sugarcane"),
    variety: z.string().trim().min(1).max(80).optional().default("Co 86032"),
    plantingDate: dateString,
    soilType: z.enum(["Sandy", "Sandy Loam", "Loam", "Clay Loam", "Clay"]),
    lat: coordinate(-90, 90).optional(),
    lng: coordinate(-180, 180).optional(),
});

const plotUpdateSchema = plotSchema.partial();

const irrigationLogSchema = z.object({
    durationHours: z.coerce.number().finite().min(0).max(72),
    waterAppliedM3: z.coerce.number().finite().min(0).max(1000000),
});

function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body || {});
        if (!result.success) {
            return res.status(400).json({
                error: "Invalid request data.",
                details: result.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        req.body = result.data;
        next();
    };
}

module.exports = {
    registrationSchema,
    loginSchema,
    plotSchema,
    plotUpdateSchema,
    irrigationLogSchema,
    validateBody,
};