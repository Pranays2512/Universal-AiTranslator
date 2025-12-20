describe('Redis config in test env', () => {
  it('exports stubbed clients with expected methods', async () => {
    // Ensure NODE_ENV is test (Jest sets this by default)
    const { redisClient, redisSubscriber, redisPublisher } = require('../../config/redis');

    expect(redisClient).toBeDefined();
    expect(typeof redisClient.on).toBe('function');
    expect(typeof redisSubscriber.subscribe).toBe('function');
    expect(typeof redisPublisher.publish).toBe('function');

    // Methods should not throw when called
    await expect(redisSubscriber.subscribe('some-channel')).resolves.toBeUndefined();
    await expect(redisPublisher.publish('c', 'm')).resolves.toBeUndefined();
  });
});
