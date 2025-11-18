const jwt = require('jsonwebtoken');
const { redisPublisher, redisSubscriber } = require('../config/redis.js');
const { addTranslationJob, translationQueue } = require('../queue/translationQueue.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

const connectedUsers = new Map();

function initializeWebSocket(io) {
redisSubscriber.subscribe('translation:completed', 'user:notification');

redisSubscriber.on('message', (channel, message) => {
const data = JSON.parse(message);

switch (channel) {
case 'translation:completed':
handleTranslationCompleted(io, data);
break;
case 'user:notification':
handleUserNotification(io, data);
break;
}
});

translationQueue.on('completed', async (job, result) => {
await redisPublisher.publish('translation:completed', JSON.stringify({
jobId: job.id,
result,
timestamp: new Date().toISOString()
}));
});

io.on('connection', (socket) => {
console.log(`Client connected: ${socket.id}`);

socket.on('authenticate', async (token) => {
try {
const decoded = jwt.verify(token, JWT_SECRET);
const user = await prisma.user.findUnique({
where: { id: decoded.userId }
});

if (user) {
socket.userId = user.id;
socket.userEmail = user.email;
connectedUsers.set(user.id, socket.id);

socket.emit('authenticated', {
success: true,
user: { id: user.id, name: user.name, email: user.email }
});

console.log(`User authenticated: ${user.email} (${socket.id})`);

await redisPublisher.publish('user:notification', JSON.stringify({
type: 'user_connected',
userId: user.id,
socketId: socket.id
}));
} else {
socket.emit('authenticated', { success: false, message: 'User not found' });
}
} catch (error) {
console.error('Authentication error:', error);
socket.emit('authenticated', { success: false, message: 'Invalid token' });
}
});

socket.on('translate', async (data) => {
if (!socket.userId) {
socket.emit('translation:error', { message: 'Not authenticated' });
return;
}

const { text, targetLang } = data;

if (!text || !targetLang) {
socket.emit('translation:error', { message: 'Text and target language required' });
return;
}

if (text.length > 5000) {
socket.emit('translation:error', { message: 'Text too long' });
return;
}

try {
const job = await addTranslationJob({
text,
targetLang,
userId: socket.userId,
socketId: socket.id,
priority: 5
});

let position = 0;
try {
position = await job.getPosition();
} catch (err) {
console.log('Could not get job position:', err.message);
}

socket.emit('translation:queued', {
jobId: job.id,
position: position
});

console.log(`Translation queued: Job ${job.id} for user ${socket.userId}`);
} catch (error) {
console.error('Translation queue error:', error);
socket.emit('translation:error', { message: 'Failed to queue translation' });
}
});

socket.on('typing', async (data) => {
if (socket.userId) {
await redisPublisher.publish('user:notification', JSON.stringify({
type: 'user_typing',
userId: socket.userId,
timestamp: new Date().toISOString()
}));
}
});

socket.on('disconnect', async () => {
console.log(`Client disconnected: ${socket.id}`);

if (socket.userId) {
connectedUsers.delete(socket.userId);

await redisPublisher.publish('user:notification', JSON.stringify({
type: 'user_disconnected',
userId: socket.userId,
socketId: socket.id
}));
}
});

socket.on('error', (error) => {
console.error(`Socket error for ${socket.id}:`, error);
});
});
}

function handleTranslationCompleted(io, data) {
const { result } = data;
const { userId, socketId, translatedText, detectedLanguage } = result;

const socket = io.sockets.sockets.get(socketId);
if (socket) {
socket.emit('translation:completed', {
translatedText,
detectedLanguage,
timestamp: new Date().toISOString()
});

console.log(`Translation delivered to socket ${socketId}`);
} else {
console.log(`Socket ${socketId} not found, user may have disconnected`);
}
}

function handleUserNotification(io, data) {
const { type, userId, socketId } = data;

switch (type) {
case 'user_connected':
console.log(`User ${userId} connected on another server instance`);
break;
case 'user_disconnected':
console.log(`User ${userId} disconnected from another server instance`);
break;
case 'user_typing':
break;
}
}

module.exports = {
initializeWebSocket,
connectedUsers
};
