const { PrismaClient } = require('@prisma/client');

// Create a singleton Prisma client instance
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    // In development, use a global variable to prevent multiple instances during hot reload
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

module.exports = prisma;
