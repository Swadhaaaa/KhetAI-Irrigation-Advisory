const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

function createPrismaClient() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be configured for PostgreSQL storage.");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    return { prisma, pool };
}

module.exports = { createPrismaClient };