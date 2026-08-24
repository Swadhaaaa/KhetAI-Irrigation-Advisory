// Run with: npm run seed
// Creates a demo farmer account (mobile: 9999999999 / password: demo1234)
// with two plots and two weeks of realistic sensor history, so the
// dashboard has something meaningful to show immediately after setup.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { generateId } = require("./idgen");
const { backfillHistory, ensureTodayReading } = require("./sensorSim");

function seed() {
  const users = db.getAll("users");
  if (users.some((u) => u.mobile === "9999999999")) {
    console.log("Demo account already exists (mobile: 9999999999). Skipping seed.");
    return;
  }

  const user = {
    id: generateId("usr"),
    name: "Ramesh Patil",
    mobile: "9999999999",
    village: "Yalakarti",
    taluk: "Hukkeri",
    district: "Belagavi",
    passwordHash: bcrypt.hashSync("demo1234", 10),
    createdAt: new Date().toISOString(),
  };
  db.insert("users", user);

  const plotsData = [
    { name: "Patil Farm - Plot 12", area: 5.6, variety: "Co 86032", soilType: "Clay Loam", monthsOld: 6 },
    { name: "Patil Farm - Plot 14", area: 3.2, variety: "Co 0238", soilType: "Loam", monthsOld: 2 },
  ];

  plotsData.forEach((p) => {
    const planting = new Date();
    planting.setMonth(planting.getMonth() - p.monthsOld);
    const plot = {
      id: generateId("plt"),
      userId: user.id,
      name: p.name,
      area: p.area,
      crop: "Sugarcane",
      variety: p.variety,
      plantingDate: planting.toISOString().slice(0, 10),
      soilType: p.soilType,
      lat: 16.5 + (Math.random() - 0.5) * 0.4,
      lng: 75.1 + (Math.random() - 0.5) * 0.4,
      createdAt: new Date().toISOString(),
    };
    db.insert("plots", plot);
    backfillHistory(plot, 14);
    ensureTodayReading(plot);
  });

  console.log("\n✅ Demo data seeded.");
  console.log("   Login with mobile: 9999999999  |  password: demo1234\n");
}

seed();
