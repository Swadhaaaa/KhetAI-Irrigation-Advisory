// Run with: npm run seed
// Creates idempotent PostgreSQL demo data for local development.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const repository = require("../repositories/postgres.repository");
const { backfillHistory, ensureTodayReading } = require("./sensorSim");

async function seed() {
    const existing = await repository.findUserByMobile("9999999999");
    if (existing) {
        console.log("Demo account already exists (mobile: 9999999999). Skipping seed.");
        return;
    }

    const user = await repository.createUser({
        name: "Ramesh Patil",
        mobile: "9999999999",
        village: "Yalakarti",
        taluk: "Hukkeri",
        district: "Belagavi",
        passwordHash: bcrypt.hashSync("demo1234", 10),
    });

    const plotsData = [
        { name: "Patil Farm - Plot 12", area: 5.6, variety: "Co 86032", soilType: "Clay Loam", monthsOld: 6 },
        { name: "Patil Farm - Plot 14", area: 3.2, variety: "Co 0238", soilType: "Loam", monthsOld: 2 },
    ];

    for (const data of plotsData) {
        const planting = new Date();
        planting.setMonth(planting.getMonth() - data.monthsOld);
        const plot = await repository.createPlot(user.id, {
            name: data.name,
            area: data.area,
            crop: "Sugarcane",
            variety: data.variety,
            plantingDate: planting.toISOString().slice(0, 10),
            soilType: data.soilType,
            lat: 16.5 + (Math.random() - 0.5) * 0.4,
            lng: 75.1 + (Math.random() - 0.5) * 0.4,
        });
        await backfillHistory(plot, 14);
        await ensureTodayReading(plot);
    }

    console.log("\nDemo PostgreSQL data seeded.");
    console.log("Login with mobile: 9999999999 | password: demo1234\n");
}

seed()
    .catch((error) => {
        console.error("PostgreSQL seed failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => repository.disconnect());
