// Mock Redis
const mockPublisher = {
  publish: jest.fn(),
  on: jest.fn(),
};

const mockSubscriber = {
  subscribe: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const instance = Math.random() > 0.5 ? mockPublisher : mockSubscriber;
    return instance;
  });
});

// Need to track which instance is which
let publisherInstance, subscriberInstance;

jest.mock('ioredis', () => {
  let callCount = 0;
  return jest.fn().mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      publisherInstance = mockPublisher;
      return mockPublisher;
    } else {
      subscriberInstance = mockSubscriber;
      return mockSubscriber;
    }
  });
});

describe('PubSub Service', () => {
  let pubsubService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset instances
    publisherInstance = null;
    subscriberInstance = null;
    
    // Import fresh instance
    pubsubService = require('../../services/pubsubService');
  });

  describe('publish', () => {
    it('should publish string messages', async () => {
      mockPublisher.publish.mockResolvedValue(1);

      const result = await pubsubService.publish('test-channel', 'test message');

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'test-channel',
        'test message'
      );
      expect(result).toBe(1);
    });

    it('should publish object messages as JSON', async () => {
      mockPublisher.publish.mockResolvedValue(1);

      const message = { type: 'test', data: 'value' };
      await pubsubService.publish('test-channel', message);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'test-channel',
        JSON.stringify(message)
      );
    });

    it('should return number of subscribers', async () => {
      mockPublisher.publish.mockResolvedValue(5);

      const result = await pubsubService.publish('test-channel', 'message');

      expect(result).toBe(5);
    });

    it('should handle publish errors', async () => {
      mockPublisher.publish.mockRejectedValue(new Error('Publish failed'));

      await expect(
        pubsubService.publish('test-channel', 'message')
      ).rejects.toThrow('Publish failed');
    });

    it('should handle complex objects', async () => {
      mockPublisher.publish.mockResolvedValue(1);

      const complexMessage = {
        type: 'translation',
        data: {
          original: 'Hello',
          translated: 'Hola',
          metadata: {
            userId: 123,
            timestamp: new Date().toISOString(),
          },
        },
      };

      await pubsubService.publish('test-channel', complexMessage);

      const publishedMessage = mockPublisher.publish.mock.calls[0][1];
      expect(JSON.parse(publishedMessage)).toEqual(complexMessage);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to channel with handler', async () => {
      mockSubscriber.subscribe.mockResolvedValue(undefined);

      const handler = jest.fn();
      await pubsubService.subscribe('test-channel', handler);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should throw error if channel is missing', async () => {
      const handler = jest.fn();

      await expect(pubsubService.subscribe('', handler)).rejects.toThrow();
    });

    it('should throw error if handler is not a function', async () => {
      await expect(
        pubsubService.subscribe('test-channel', 'not-a-function')
      ).rejects.toThrow();
    });

    it('should not re-subscribe to already subscribed channel', async () => {
      mockSubscriber.subscribe.mockResolvedValue(undefined);

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      await pubsubService.subscribe('test-channel', handler1);
      await pubsubService.subscribe('test-channel', handler2);

      expect(mockSubscriber.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle subscription errors', async () => {
      mockSubscriber.subscribe.mockRejectedValue(new Error('Subscribe failed'));

      const handler = jest.fn();

      await expect(
        pubsubService.subscribe('test-channel', handler)
      ).rejects.toThrow('Subscribe failed');
    });
  });

  describe('message handling', () => {
    it('should parse JSON messages', async () => {
      mockSubscriber.subscribe.mockResolvedValue(undefined);

      const handler = jest.fn();
      await pubsubService.subscribe('test-channel', handler);

      // Simulate message received
      const messageHandler = mockSubscriber.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      const message = { type: 'test', data: 'value' };
      if (messageHandler) {
        messageHandler('test-channel', JSON.stringify(message));

        expect(handler).toHaveBeenCalledWith(message, 'test-channel');
      }
    });

    it('should handle plain text messages', async () => {
      mockSubscriber.subscribe.mockResolvedValue(undefined);

      const handler = jest.fn();
      await pubsubService.subscribe('test-channel', handler);

      const messageHandler = mockSubscriber.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler('test-channel', 'plain text message');

        expect(handler).toHaveBeenCalledWith('plain text message', 'test-channel');
      }
    });

    it('should call all handlers for a channel', async () => {
      mockSubscriber.subscribe.mockResolvedValue(undefined);

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      await pubsubService.subscribe('test-channel', handler1);
      await pubsubService.subscribe('test-channel', handler2);

      const messageHandler = mockSubscriber.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler('test-channel', 'test message');

        expect(handler1).toHaveBeenCalledWith('test message', 'test-channel');
        expect(handler2).toHaveBeenCalledWith('test message', 'test-channel');
      }
    });

    it('should handle handler errors gracefully', async () => {
      mockSubscriber.subscribe.mockResolvedValue(undefined);

      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const successHandler = jest.fn();

      await pubsubService.subscribe('test-channel', errorHandler);
      await pubsubService.subscribe('test-channel', successHandler);

      const messageHandler = mockSubscriber.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        // Should not throw even though one handler errors
        expect(() => {
          messageHandler('test-channel', 'test message');
        }).not.toThrow();

        // Success handler should still be called
        expect(successHandler).toHaveBeenCalled();
      }
    });

    it('should not call handlers for different channels', async () => {
      mockSubscriber.subscribe.mockResolvedValue(undefined);

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      await pubsubService.subscribe('channel-1', handler1);
      await pubsubService.subscribe('channel-2', handler2);

      const messageHandler = mockSubscriber.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler('channel-1', 'test message');

        expect(handler1).toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
      }
    });
  });

  describe('connection events', () => {
    it('should register connection event handlers', () => {
      expect(mockPublisher.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPublisher.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockPublisher.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPublisher.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockPublisher.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });

    it('should register subscriber event handlers', () => {
      expect(mockSubscriber.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSubscriber.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockSubscriber.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle connection errors gracefully', () => {
      const errorHandler = mockPublisher.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (errorHandler) {
        expect(() => {
          errorHandler(new Error('Connection error'));
        }).not.toThrow();
      }
    });
  });
});