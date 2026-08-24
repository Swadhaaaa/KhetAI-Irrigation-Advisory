// Lightweight JSON file "database".
// This avoids native-module build issues (e.g. sqlite) so the project
// runs the same way on every machine with nothing but Node.js installed.
// For a real production deployment, swap this module out for Postgres/Mongo
// while keeping the same function signatures used by the routes.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");

function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// Generic collection helpers -------------------------------------------------

function getAll(collection) {
  const db = readDB();
  return db[collection] || [];
}

function saveAll(collection, records) {
  const db = readDB();
  db[collection] = records;
  writeDB(db);
}

function insert(collection, record) {
  const db = readDB();
  if (!db[collection]) db[collection] = [];
  db[collection].push(record);
  writeDB(db);
  return record;
}

function update(collection, id, patch) {
  const db = readDB();
  const list = db[collection] || [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  db[collection] = list;
  writeDB(db);
  return list[idx];
}

function remove(collection, id) {
  const db = readDB();
  const list = db[collection] || [];
  const next = list.filter((r) => r.id !== id);
  db[collection] = next;
  writeDB(db);
  return next.length !== list.length;
}

function findById(collection, id) {
  const list = getAll(collection);
  return list.find((r) => r.id === id) || null;
}

module.exports = { readDB, writeDB, getAll, saveAll, insert, update, remove, findById };
