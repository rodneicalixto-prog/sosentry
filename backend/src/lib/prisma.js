const { PrismaClient } = require('@prisma/client');
// Singleton — evita múltiplos connection pools em produção
const prisma = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;
module.exports = prisma;
