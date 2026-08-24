const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { generateId } = require("../utils/idgen");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, mobile: user.mobile },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.post("/register", (req, res) => {
  const { name, mobile, password, village, taluk, district } = req.body || {};

  if (!name || !mobile || !password) {
    return res.status(400).json({ error: "Name, mobile number and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const users = db.getAll("users");
  if (users.some((u) => u.mobile === mobile)) {
    return res.status(409).json({ error: "An account with this mobile number already exists." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = {
    id: generateId("usr"),
    name,
    mobile,
    village: village || "",
    taluk: taluk || "",
    district: district || "",
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.insert("users", user);

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { mobile, password } = req.body || {};
  if (!mobile || !password) {
    return res.status(400).json({ error: "Mobile number and password are required." });
  }

  const users = db.getAll("users");
  const user = users.find((u) => u.mobile === mobile);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid mobile number or password." });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.findById("users", req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

module.exports = router;
