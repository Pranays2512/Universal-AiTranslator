// Jest setup file - runs before each test file
require('dotenv').config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/translator_test';

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings during tests (optional)
const originalWarn = console.warn;
console.warn = (...args) => {
    // Suppress Redis connection warnings in tests
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Redis warning')) {
        return;
    }
    originalWarn(...args);
};

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
