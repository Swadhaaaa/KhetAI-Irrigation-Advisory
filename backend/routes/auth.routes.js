const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("../middleware/auth");
const { validateBody, registrationSchema, loginSchema } = require("../utils/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { findUserById, findUserByMobile, createUser } = require("../repositories/postgres.repository");

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

router.post("/register", validateBody(registrationSchema), asyncHandler(async (req, res) => {
  const { name, mobile, password, village, taluk, district } = req.body || {};

  if (await findUserByMobile(mobile)) {
    return res.status(409).json({ error: "An account with this mobile number already exists." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  let user;
  try {
    user = await createUser({ name, mobile, village, taluk, district, passwordHash });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "An account with this mobile number already exists." });
    }
    throw error;
  }

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
}));

router.post("/login", validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { mobile, password } = req.body || {};
  const user = await findUserByMobile(mobile);
  if (!user || !user.isActive || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid mobile number or password." });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user || !user.isActive) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
}));

module.exports = router;
