/**
 * Test Utilities
 * Common helper functions for tests
 */

/**
 * Create a mock request object
 */
function createMockRequest(options = {}) {
    return {
        body: options.body || {},
        query: options.query || {},
        params: options.params || {},
        headers: options.headers || {},
        user: options.user || { id: 'test-user-id' },
        file: options.file || null,
        files: options.files || null,
        ...options
    };
}

/**
 * Create a mock response object
 */
function createMockResponse() {
    const res = {
        statusCode: 200,
        data: null
    };

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });

    res.json = jest.fn((data) => {
        res.data = data;
        return res;
    });

    res.send = jest.fn((data) => {
        res.data = data;
        return res;
    });

    res.sendStatus = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });

    return res;
}

/**
 * Create a mock next function
 */
function createMockNext() {
    return jest.fn();
}

/**
 * Wait for a specified time
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock JWT token
 */
function createMockToken(payload = {}) {
    return `mock.token.${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
}

/**
 * Create mock translation data
 */
function createMockTranslation(overrides = {}) {
    return {
        id: 'test-id',
        userId: 'test-user',
        originalText: 'Hello',
        translatedText: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
        created_at: new Date(),
        ...overrides
    };
}

/**
 * Create mock user data
 */
function createMockUser(overrides = {}) {
    return {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword123',
        created_at: new Date(),
        ...overrides
    };
}

module.exports = {
    createMockRequest,
    createMockResponse,
    createMockNext,
    wait,
    createMockToken,
    createMockTranslation,
    createMockUser
};
