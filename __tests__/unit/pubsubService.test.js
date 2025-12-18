// Mock Redis before imports
jest.mock('../../config/redis', () => ({
    redisPublisher: {
        publish: jest.fn().mockResolvedValue(1)
    },
    redisSubscriber: {
        subscribe: jest.fn().mockResolvedValue(undefined),
        on: jest.fn()
    }
}));

const pubsubService = require('../../services/pubsubService');
const { redisPublisher, redisSubscriber } = require('../../config/redis');

describe('PubSubService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('publishTranslationUpdate', () => {
        it('should publish translation updates to Redis', async () => {
            const data = {
                socketId: 'socket123',
                status: 'completed',
                result: { translated: 'hola' }
            };

            await pubsubService.publishTranslationUpdate(data);

            expect(redisPublisher.publish).toHaveBeenCalledWith(
                expect.any(String),
                JSON.stringify(data)
            );
        });

        it('should handle publish errors gracefully', async () => {
            redisPublisher.publish.mockRejectedValue(new Error('Redis error'));

            await expect(
                pubsubService.publishTranslationUpdate({ socketId: 'test' })
            ).resolves.not.toThrow();
        });
    });

    describe('subscribeToTranslationUpdates', () => {
        it('should subscribe to Redis channel', async () => {
            const callback = jest.fn();

            await pubsubService.subscribeToTranslationUpdates(callback);

            expect(redisSubscriber.subscribe).toHaveBeenCalled();
        });

        it('should register message handler', () => {
            const callback = jest.fn();

            pubsubService.subscribeToTranslationUpdates(callback);

            expect(redisSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
        });
    });
});
