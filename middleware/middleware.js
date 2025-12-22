const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "9f4a7d3a4c0e8a7d1d61caa42a87dfc1454c1a2c19f7075e69f49c842dbd8c3c";
