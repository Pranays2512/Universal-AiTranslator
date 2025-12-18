describe('Environment Variables', () => {
    it('should have required environment variables in test mode', () => {
        expect(process.env.NODE_ENV).toBe('test');
        expect(process.env.PORT).toBeDefined();
        expect(process.env.DATABASE_URL).toBeDefined();
    });

    it('should have Redis configuration', () => {
        expect(process.env.REDIS_HOST).toBeDefined();
        expect(process.env.REDIS_PORT).toBeDefined();
    });

    it('should have JWT secret', () => {
        expect(process.env.JWT_SECRET).toBeDefined();
    });

    it('should have testing flag set', () => {
        expect(process.env.IS_TESTING).toBe('true');
    });
});
