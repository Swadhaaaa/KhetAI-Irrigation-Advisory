require("dotenv").config();

const db = require("../db");
const { createPrismaClient } = require("../prisma/client");

async function verify() {
    const source = db.readDB();
    const { prisma, pool } = createPrismaClient();
    const expected = {
        users: (source.users || []).length,
        farms: (source.users || []).length,
        plots: (source.plots || []).length,
        sensorReadings: (source.sensorReadings || []).length,
        irrigationEvents: (source.irrigationLogs || []).length,
    };
    const actual = {
        users: await prisma.user.count({ where: { id: { startsWith: "usr_" } } }),
        farms: await prisma.farm.count({ where: { id: { startsWith: "legacy-farm-" } } }),
        plots: await prisma.plot.count({ where: { id: { startsWith: "plt_" } } }),
        sensorReadings: await prisma.sensorReading.count({ where: { provenance: "SIMULATED" } }),
        irrigationEvents: await prisma.irrigationEvent.count({ where: { source: { in: ["SIMULATOR", "FARMER"] } } }),
    };
    const mismatches = Object.keys(expected).filter((key) => expected[key] !== actual[key]);

    console.log(JSON.stringify({
        status: mismatches.length ? "mismatch" : "ok",
        expected,
        actual,
        mismatches,
        notes: {
            alerts: "Legacy JSON alert entries are read markers only; generated alert records require route-level persistence before they can be verified.",
            weather: "Legacy JSON contains no weather records.",
            advisories: "Legacy JSON contains no advisory snapshots.",
        },
    }, null, 2));

    await prisma.$disconnect();
    await pool.end();
    if (mismatches.length) process.exitCode = 2;
}

verify().catch((error) => {
    console.error("JSON/PostgreSQL verification failed:", error.message);
    process.exitCode = 1;
});
