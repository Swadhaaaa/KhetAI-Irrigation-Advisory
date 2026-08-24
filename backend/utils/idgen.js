const crypto = require("crypto");

/** Short, readable unique id e.g. "plt_9f3a2c1b" */
function generateId(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
}

module.exports = { generateId };
