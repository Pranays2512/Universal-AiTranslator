const Redis = require('ioredis');
const { redisConfig } = require('../config/redis');

const publisher = new Redis(redisConfig);
const subscriber = new Redis(redisConfig);

const handlers = new Map();
const subscribedChannels = new Set();

const safeLog = (prefix) => (msg, ...rest) => {
    try {
        if (rest && rest.length) console.log(`${prefix}:`, msg, ...rest);
        else console.log(`${prefix}:`, msg);
    } catch (e) {
    }
};

publisher.on('connect', () => console.log('Publisher connected to Redis'));
publisher.on('ready', () => console.log('Publisher ready'));
publisher.on('error', (err) => console.error('Publisher Redis error:', err && err.message ? err.message : err));
publisher.on('close', () => console.log('Publisher connection closed'));
publisher.on('reconnecting', () => console.log('Publisher reconnecting'));

subscriber.on('connect', () => console.log('Subscriber connected to Redis'));
subscriber.on('ready', () => console.log('Subscriber ready'));
subscriber.on('error', (err) => console.error('Subscriber Redis error:', err && err.message ? err.message : err));
subscriber.on('close', () => console.log('Subscriber connection closed'));
subscriber.on('reconnecting', () => console.log('Subscriber reconnecting'));

subscriber.on('message', (channel, message) => {
    console.log(`Pub/Sub message received on channel '${channel}': ${message}`);

    let parsed = message;
    try {
        parsed = JSON.parse(message);
    } catch (e) {
    }

    const list = handlers.get(channel);
    if (list && list.length) {
        for (const h of list) {
            try {
                h(parsed, channel);
            } catch (err) {
                console.error(`Handler error for channel ${channel}:`, err && err.message ? err.message : err);
            }
        }
    }
});

async function publish(channel, message) {
    try {
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        const result = await publisher.publish(channel, payload);
        console.log(`Published to '${channel}' (${result} subscribers)`);
        return result;
    } catch (error) {
        console.error('Publish error:', error && error.message ? error.message : error);
        throw error;
    }
}
async function subscribe(channel, handler) {
    if (!channel || typeof handler !== 'function') {
        throw new Error('subscribe requires (channel, handler)');
    }

    if (!handlers.has(channel)) handlers.set(channel, []);
    handlers.get(channel).push(handler);

    if (!subscribedChannels.has(channel)) {
        try {
            await subscriber.subscribe(channel);
            subscribedChannels.add(channel);
            console.log(`Subscribed Redis client to channel '${channel}'`);
        } catch (error) {
            console.error(`Failed to subscribe to channel ${channel}:`, error && error.message ? error.message : error);
            throw error;
        }
    } else {
        console.log(`Added handler for already-subscribed channel '${channel}'`);
    }
}

module.exports = {
    publish,
    subscribe
};
