const { subscribe } = require('../services/pubsubService');

let io;
try {
    const serverModule = require('../server');
    io = serverModule.io || serverModule.getIo;
    if (typeof io === 'function') io = io();
} catch (e) {
}

try {
    if (!io) {
        const socketHandler = require('../websocket/socketHandler');
        io = socketHandler.io;
    }
} catch (e) {
}

console.log('translationSubscriber: starting, io available?', !!io);

subscribe('translation.completed', (payload) => {
    try {
        console.log('translationSubscriber: received payload', payload);
        const { userId } = payload || {};

        if (io && typeof io.to === 'function') {
            io.to(userId).emit('translationCompleted', payload);
            console.log(`translationSubscriber: emitted to user ${userId}`);
        } else {
            console.warn('translationSubscriber: socket.io instance not found, cannot emit to client');
        }
    } catch (err) {
        console.error('translationSubscriber handler error:', err && err.message ? err.message : err);
    }
});
