const Redis = require('ioredis');

const redisConfig = {
	host: process.env.REDIS_HOST || 'localhost',
	port: process.env.REDIS_PORT || 6379,
	password: process.env.REDIS_PASSWORD || undefined,
	retryStrategy: (times) => {
		const delay = Math.min(times * 50, 2000);
		return delay;
	},
	// Prevent ioredis from throwing MaxRetriesPerRequestError when Redis is unavailable
	maxRetriesPerRequest: null
};

// Avoid creating real Redis connections during tests to prevent open handles
// and to allow tests to mock `ioredis` constructor deterministically.
let redisClient;
let redisSubscriber;
let redisPublisher;

// Graceful error logging to avoid unhandled exceptions crashing the app
const safeLog = (prefix) => (err) => {
	console.warn(`${prefix} Redis warning:`, err && err.message ? err.message : err);
};

if (process.env.NODE_ENV !== 'test') {
	redisClient = new Redis(redisConfig);
	redisSubscriber = new Redis(redisConfig);
	redisPublisher = new Redis(redisConfig);

	redisClient.on('error', safeLog('Client'));
	redisSubscriber.on('error', safeLog('Subscriber'));
	redisPublisher.on('error', safeLog('Publisher'));
} else {
	// Minimal no-op stubs so that modules requiring these in tests don't throw
	const noop = () => {};
	const stub = { on: noop, subscribe: async () => {}, publish: async () => {} };
	redisClient = stub;
	redisSubscriber = stub;
	redisPublisher = stub;
}

module.exports = {
	redisClient,
	redisSubscriber,
	redisPublisher,
	redisConfig
};