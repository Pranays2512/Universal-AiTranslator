require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const routes = require('./routes/routes.js');
const { initializeWebSocket } = require('./websocket/socketHandler.js');
const { redisClient, redisSubscriber } = require('./config/redis.js');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware - Increase payload limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/', routes);

// Initialize WebSocket handlers
initializeWebSocket(io);

// Redis connection
redisClient.on('connect', () => {
    console.log('✓ Redis client connected');
});

redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

redisSubscriber.on('connect', () => {
    console.log('✓ Redis subscriber connected');
});

redisSubscriber.on('error', (err) => {
    console.error('Redis subscriber error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await redisClient.quit();
    await redisSubscriber.quit();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   Server running on port ${PORT}        ║
║   http://localhost:${PORT}              ║
║   WebSocket: Connected                 ║
║   Redis: Connected                     ║
╚═══════════════════════════════════════╝
    `);
});