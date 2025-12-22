# Functional Testing Guide

## Overview
Functional tests verify that features work correctly from an end-user perspective. They test complete workflows and business logic.

## What is Functional Testing?

Functional testing validates that the application functions according to requirements:
- **What it tests**: Complete features and user workflows
- **Focus**: User interactions and expected outcomes
- **Scope**: Business logic, feature integration, user scenarios

## Functional Test Categories

### 1. Translation Functionality (`translation.test.js`)
Tests the core translation feature:
- ✅ Text translation between languages
- ✅ Auto-language detection
- ✅ Multi-language support
- ✅ Long text handling
- ✅ Special characters and emojis
- ✅ Cache integration
- ✅ Batch translation
- ✅ Error handling

### 2. OCR Functionality (`ocr.test.js`)
Tests image text extraction:
- ✅ Text extraction from images
- ✅ Multi-language OCR
- ✅ Image quality handling
- ✅ Image preprocessing
- ✅ OCR + Translation pipeline
- ✅ Different image formats (PNG, JPEG, WebP)
- ✅ Base64 image processing
- ✅ Performance benchmarks

### 3. Authentication (`authentication.test.js`)
Tests user auth workflows:
- ✅ User registration
- ✅ Email validation
- ✅ Password strength requirements
- ✅ Password hashing
- ✅ User login
- ✅ JWT token generation
- ✅ Token validation
- ✅ Session management
- ✅ Logout functionality

### 4. Cache System (`cache.test.js`)
Tests caching functionality:
- ✅ Data storage and retrieval
- ✅ Cache hit/miss scenarios
- ✅ TTL (Time To Live) management
- ✅ Cache expiration
- ✅ Cache invalidation
- ✅ Hit rate tracking
- ✅ Performance optimization
- ✅ Concurrent requests
- ✅ Error handling

### 5. File Upload (`fileUpload.test.js`)
Tests file handling:
- ✅ File type validation
- ✅ File size limits
- ✅ Image processing
- ✅ File storage
- ✅ Image resizing/optimization
- ✅ Format conversion
- ✅ Temporary file cleanup
- ✅ Batch upload
- ✅ Base64 encoding/decoding

## Running Functional Tests

```bash
# Run all functional tests
npm run test:functional

# Run specific functional test
npm test -- translation.test.js

# Run with verbose output
npm test -- --verbose __tests__/functional

# Run with coverage
npm test -- --coverage __tests__/functional
```

## Writing Functional Tests

### Best Practices

1. **Test User Scenarios**
```javascript
it('should allow user to translate text and save to history', async () => {
    // Simulate complete user workflow
    const translation = await translateText('Hello', 'es');
    await saveToHistory(translation);
    const history = await getUserHistory();
    
    expect(history).toContain(translation);
});
```

2. **Test Edge Cases**
```javascript
it('should handle very long text translation', async () => {
    const longText = 'word '.repeat(10000);
    const result = await translateText(longText, 'es');
    
    expect(result).toBeDefined();
});
```

3. **Test Error Scenarios**
```javascript
it('should handle network failure gracefully', async () => {
    mockNetworkFailure();
    
    const result = await translateText('Hello', 'es');
    
    expect(result.error).toBeDefined();
});
```

4. **Test Performance**
```javascript
it('should complete translation within 3 seconds', async () => {
    const start = Date.now();
    await translateText('Hello', 'es');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
});
```

## Test Data

Use the `MockDataFactory` helper:

```javascript
const MockDataFactory = require('../helpers/mockFactory');

const user = MockDataFactory.createMockUser();
const translations = MockDataFactory.createTranslations(10);
const file = MockDataFactory.createMockFile('image/png');
```

## Common Patterns

### Testing Async Operations
```javascript
it('should process async operation', async () => {
    const result = await asyncOperation();
    expect(result).toBeDefined();
});
```

### Testing Error Handling
```javascript
it('should throw error for invalid input', async () => {
    await expect(operation(null)).rejects.toThrow();
});
```

### Testing State Changes
```javascript
it('should update state correctly', async () => {
    const before = await getState();
    await updateState();
    const after = await getState();
    
    expect(after).not.toEqual(before);
});
```

## Coverage Goals

| Feature | Target | Current |
|---------|--------|---------|
| Translation | 90% | ✓ |
| OCR | 85% | ✓ |
| Authentication | 95% | ✓ |
| Cache | 90% | ✓ |
| File Upload | 85% | ✓ |

## Integration with CI/CD

```yaml
# Example GitHub Actions
- name: Run Functional Tests
  run: npm run test:functional
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Timing Out
- Increase timeout: `jest.setTimeout(10000)`
- Mock external dependencies
- Optimize async operations

### Flaky Tests
- Remove test dependencies
- Use proper setup/teardown
- Mock time-dependent operations

### Mock Issues
- Mock before imports
- Clear mocks in beforeEach
- Verify mock calls

## Future Enhancements

- [ ] Add visual regression tests
- [ ] Add load/stress tests
- [ ] Add security tests
- [ ] Add accessibility tests
- [ ] Add browser compatibility tests
