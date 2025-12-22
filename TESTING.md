# Testing Documentation

## Overview

This project uses **Jest** as the testing framework with **Supertest** for API integration testing.

## Test Structure

```
__tests__/
├── unit/           # Unit tests for individual modules
│   ├── cacheService.test.js
│   ├── historyService.test.js
│   ├── translationController.test.js
│   ├── fileUploadController.test.js
│   ├── historyController.test.js
│   ├── middleware.test.js
│   ├── controller.test.js
│   ├── translationQueue.test.js
│   ├── pubsubService.test.js
│   ├── socketHandler.test.js
│   ├── commonPhrases.test.js
│   └── environment.test.js
├── integration/    # Integration tests for API endpoints
│   ├── routes.test.js
│   ├── health.test.js
│   └── cache.test.js
├── functional/     # Functional tests for features
│   ├── translation.test.js
│   ├── ocr.test.js
│   ├── authentication.test.js
│   ├── cache.test.js
│   └── fileUpload.test.js
├── e2e/            # End-to-end tests
│   └── userFlow.test.js
└── helpers/        # Test utilities
    ├── testUtils.js
    └── mockFactory.js
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run only unit tests

```bash
npm run test:unit
```

### Run only integration tests

```bash
npm run test:integration
```

### Run only functional tests
```bash
npm run test:functional
```

### Run only e2e tests
```bash
npm run test:e2e
```

### Run all tests with verbose output
```bash
npm run test:all
```

### Run with coverage report

```bash
npm test
```

Coverage reports will be generated in the `coverage/` directory.

## Test Configuration

### jest.config.js

- Test environment: Node.js
- Coverage directory: `coverage/`
- Test timeout: 10 seconds
- Setup file: `jest.setup.js`

### jest.setup.js

- Loads test environment variables from `.env.test`
- Sets NODE_ENV to 'test'
- Configures global test settings

## Writing Tests

### Unit Test Example

```javascript
describe("ServiceName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should perform expected behavior", async () => {
    // Arrange
    const mockData = {
      /* ... */
    };

    // Act
    const result = await service.method(mockData);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example

```javascript
describe("POST /endpoint", () => {
  it("should return expected response", async () => {
    const response = await request(app)
      .post("/endpoint")
      .send({ data: "test" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("success", true);
  });
});
```

## Mocking

### Mocking Modules

```javascript
jest.mock("../../services/cacheService");
```

### Mocking Functions

```javascript
const mockFn = jest.fn().mockResolvedValue("result");
```

### Mocking Redis

Redis client is mocked in tests to avoid requiring a running Redis instance.

### Mocking Database

Prisma client is mocked to avoid requiring a test database.

## Test Utilities

The project includes helper utilities in `__tests__/helpers/`:

### testUtils.js

Provides common test setup and helper functions:

- Database connection setup for tests
- Mock data generators
- Common assertions and matchers
- Cleanup functions after tests

### mockFactory.js

Factory functions for creating mock objects:

- Mock user objects
- Mock translation data
- Mock cache data
- Mock history records

Example usage:

```javascript
const { mockFactory } = require("../helpers/mockFactory");
const mockUser = mockFactory.createMockUser();
const mockTranslation = mockFactory.createMockTranslation();
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach` and `afterEach` to reset state
3. **Descriptive Names**: Test names should clearly describe what they test
4. **AAA Pattern**: Arrange, Act, Assert
5. **Mock External Dependencies**: Mock APIs, databases, and external services
6. **Coverage**: Aim for >80% code coverage
7. **Test Organization**: Group related tests using `describe` blocks
8. **Error Testing**: Test both success and error cases
9. **Async Handling**: Use `async/await` or `.resolves` for promise-based tests
10. **Setup and Teardown**: Properly initialize and clean up test data

## CI/CD Integration

Tests should run automatically in your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
```

## Troubleshooting

### Tests timing out

Increase timeout in jest.config.js or individual tests:

```javascript
jest.setTimeout(15000);
```

### Mock not working

Ensure mocks are defined before importing the module under test.

### Coverage not including file

Check `coveragePathIgnorePatterns` in jest.config.js.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
