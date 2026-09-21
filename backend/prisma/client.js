const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

function createPrismaClient() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be configured for PostgreSQL storage.");
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.DB_POOL_MAX || 10),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
        connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    return { prisma, pool };
}

module.exports = { createPrismaClient };