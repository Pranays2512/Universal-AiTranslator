# Testing Best Practices Guide

This guide outlines best practices for writing and maintaining tests in the Universal AI Translator project.

## Test Structure and Organization

### Directory Structure

```
__tests__/
├── unit/           # Unit tests - test individual functions/modules
├── integration/    # Integration tests - test component interactions
└── helpers/        # Test utilities and mock factories
```

### File Naming Convention

- Test files should be named `*.test.js`
- Place test files adjacent to the code they test
- Use descriptive names that indicate what is being tested

## Writing Quality Tests

### 1. Use Descriptive Test Names

```javascript
// ✗ Bad
it("should work", () => {});

// ✓ Good
it("should return cached translation when valid key exists", () => {});
```

### 2. Follow AAA Pattern (Arrange-Act-Assert)

```javascript
it("should validate user email format", () => {
  // Arrange - Set up test data
  const invalidEmail = "invalid-email";

  // Act - Perform the action
  const result = validateEmail(invalidEmail);

  // Assert - Check the result
  expect(result).toBe(false);
});
```

### 3. Test One Thing Per Test

```javascript
// ✗ Bad - Tests multiple concerns
it("should create user and send email", () => {
  const user = createUser(data);
  expect(user).toBeDefined();
  const emailSent = sendEmail(user.email);
  expect(emailSent).toBe(true);
});

// ✓ Good - Focused test
it("should create user with provided data", () => {
  const user = createUser(data);
  expect(user).toHaveProperty("email", data.email);
});
```

### 4. Use Meaningful Assertions

```javascript
// ✗ Less informative
expect(result).toBe(true);

// ✓ More informative
expect(result).toEqual({
  success: true,
  message: "User created successfully",
});
```

### 5. Mock External Dependencies

```javascript
// Mock Redis for cache tests
jest.mock("../../config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock Prisma for database tests
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));
```

## Test Coverage Guidelines

### Aim for Coverage by Category

- **Happy Path**: Test the main success scenario (≥50% of tests)
- **Error Cases**: Test error handling (≥30% of tests)
- **Edge Cases**: Test boundary conditions (≥20% of tests)

### Example Coverage Plan

```javascript
describe("translateText", () => {
  // Happy Path
  it("should translate text successfully", () => {});

  // Error Cases
  it("should handle empty text", () => {});
  it("should handle invalid language code", () => {});

  // Edge Cases
  it("should handle very long text", () => {});
  it("should handle special characters", () => {});
});
```

## Setup and Teardown

### Use beforeEach for Common Setup

```javascript
describe("UserService", () => {
  let mockUser;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup common test data
    mockUser = {
      id: "123",
      email: "test@example.com",
      password: "hashed_password",
    };
  });

  afterEach(() => {
    // Cleanup after each test if needed
    jest.restoreAllMocks();
  });

  it("should create user", () => {
    // Test implementation
  });
});
```

## Async Testing

### Use async/await for Promises

```javascript
// ✗ Less clear
it("should fetch user", (done) => {
  fetchUser(1).then((user) => {
    expect(user).toBeDefined();
    done();
  });
});

// ✓ Better
it("should fetch user", async () => {
  const user = await fetchUser(1);
  expect(user).toBeDefined();
});
```

### Use .resolves and .rejects for Promise Assertions

```javascript
it("should resolve with user data", () => {
  return expect(fetchUser(1)).resolves.toHaveProperty("id", 1);
});

it("should reject with error", () => {
  return expect(fetchUser(null)).rejects.toThrow();
});
```

## Common Patterns

### Testing API Endpoints

```javascript
describe("POST /api/translate", () => {
  it("should return translated text", async () => {
    const response = await request(app).post("/api/translate").send({
      text: "Hello",
      sourceLang: "en",
      targetLang: "es",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("translatedText");
  });
});
```

### Testing Cache Operations

```javascript
describe("CacheService", () => {
  it("should store and retrieve cached data", async () => {
    const key = "translation:hello:en:es";
    const value = "Hola";

    await cacheService.set(key, value, 3600);
    const cached = await cacheService.get(key);

    expect(cached).toBe(value);
  });
});
```

## Debugging Tests

### Run Single Test File

```bash
npm test -- cacheService.test.js
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should cache"
```

### Enable Verbose Output

```bash
npm test -- --verbose
```

### Debug with Node Inspector

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Tips

1. **Keep Tests Fast**: Avoid unnecessary delays
2. **Use beforeAll for Expensive Setup**: When possible, setup once
3. **Parallelize Tests**: Jest runs tests in parallel by default
4. **Mock Network Calls**: Reduce test execution time

## Continuous Improvement

### Track Coverage

- Monitor coverage reports in `coverage/lcov-report/`
- Aim to maintain or improve coverage with each change
- Review coverage for untested code paths

### Code Review Checklist

- [ ] Tests are descriptive and focused
- [ ] All happy paths are tested
- [ ] Error cases are tested
- [ ] Mocks are properly set up and cleaned up
- [ ] Tests run consistently
- [ ] Coverage is adequate

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest for API Testing](https://github.com/visionmedia/supertest)
- [Testing JavaScript](https://testingjavascript.com/)
- [Jest Best Practices](https://jestjs.io/docs/getting-started)
