// Simulates the IoT sensor layer from the use case (soil moisture at 30cm & 60cm,
// soil temperature, ambient temperature/humidity). Real deployments would replace
// this with data ingested from LoRa/NB-IoT field sensors over the same schema.
//
// Behaviour: moisture decays a little each day (evapotranspiration draws it down)
// and jumps back up after a logged irrigation event - so the dashboard shows a
// believable, evolving trend line rather than a static number.

const { generateId } = require("./idgen");
const db = require("../db");
const { soilProfile } = require("./aiEngine");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ensureTodayReading(plot) {
  const readings = db.getAll("sensorReadings").filter((r) => r.plotId === plot.id);
  const today = todayISO();
  const existing = readings.find((r) => r.date === today);
  if (existing) return existing;

  const soil = soilProfile(plot.soilType);
  const last = readings.sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  let moisture30;
  if (!last) {
    // First ever reading for this plot: start near field capacity
    moisture30 = soil.fieldCapacity - 2;
  } else {
    const irrigatedRecently = db
      .getAll("irrigationLogs")
      .some((l) => l.plotId === plot.id && l.date === last.date);
    const naturalDrop = 0.8 + Math.random() * 0.9; // ET-driven daily depletion
    moisture30 = irrigatedRecently
      ? Math.min(soil.fieldCapacity, last.soilMoisture30 + 6 + Math.random() * 2)
      : Math.max(soil.wiltingPoint, last.soilMoisture30 - naturalDrop);
  }

  const reading = {
    id: generateId("snr"),
    plotId: plot.id,
    date: today,
    soilMoisture30: Number(moisture30.toFixed(1)),
    soilMoisture60: Number((moisture30 + 1.5 + Math.random()).toFixed(1)),
    soilTempC: Number((26 + Math.random() * 4).toFixed(1)),
    ambientTempC: Number((27 + Math.random() * 6).toFixed(1)),
    ambientHumidityPct: Math.round(55 + Math.random() * 30),
    ndvi: Number((0.55 + Math.random() * 0.3).toFixed(2)),
  };
  db.insert("sensorReadings", reading);
  return reading;
}

function getHistory(plotId, days = 14) {
  return db
    .getAll("sensorReadings")
    .filter((r) => r.plotId === plotId)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(-days);
}

function backfillHistory(plot, days = 14) {
  const soil = soilProfile(plot.soilType);
  let moisture = soil.fieldCapacity - 3;
  const readings = [];
  for (let i = days; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const irrigateEvent = i % 5 === 0; // roughly one irrigation cycle per 5 days
    moisture = irrigateEvent
      ? Math.min(soil.fieldCapacity, moisture + 6 + Math.random() * 2)
      : Math.max(soil.wiltingPoint, moisture - (0.8 + Math.random() * 0.9));

    const reading = {
      id: generateId("snr"),
      plotId: plot.id,
      date: dateStr,
      soilMoisture30: Number(moisture.toFixed(1)),
      soilMoisture60: Number((moisture + 1.5 + Math.random()).toFixed(1)),
      soilTempC: Number((26 + Math.random() * 4).toFixed(1)),
      ambientTempC: Number((27 + Math.random() * 6).toFixed(1)),
      ambientHumidityPct: Math.round(55 + Math.random() * 30),
      ndvi: Number((0.55 + Math.random() * 0.3).toFixed(2)),
    };
    readings.push(reading);
    db.insert("sensorReadings", reading);

    if (irrigateEvent) {
      db.insert("irrigationLogs", {
        id: generateId("irr"),
        plotId: plot.id,
        date: dateStr,
        durationHours: Number((1.5 + Math.random() * 2).toFixed(1)),
        waterAppliedM3: Math.round(80 + Math.random() * 60),
        loggedBy: "system-history",
      });
    }
  }
  return readings;
}

module.exports = { ensureTodayReading, getHistory, backfillHistory, todayISO };
