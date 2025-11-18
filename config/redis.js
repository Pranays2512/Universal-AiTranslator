const Redis = require('ioredis');

const redisConfig = {
	host: process.env.REDIS_HOST || 'localhost',
	port: process.env.REDIS_PORT || 6379,
	password: process.env.REDIS_PASSWORD || undefined,
	retryStrategy: (times) => {
		const delay = Math.min(times * 50, 2000);
		return delay;
	},
	maxRetriesPerRequest: null
};

const redisClient = new Redis(redisConfig);
const redisSubscriber = new Redis(redisConfig);
const redisPublisher = new Redis(redisConfig);

const safeLog = (prefix) => (err) => {
	console.warn(`${prefix} Redis warning:`, err && err.message ? err.message : err);
};

redisClient.on('error', safeLog('Client'));
redisSubscriber.on('error', safeLog('Subscriber'));
redisPublisher.on('error', safeLog('Publisher'));

module.exports = {
	redisClient,
	redisSubscriber,
	redisPublisher,
	redisConfig
};
