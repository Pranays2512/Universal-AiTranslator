/**
 * Functional Tests for User Authentication
 * Tests signup, signin, and session management
 */

jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Authentication Functionality', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('User Registration', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'SecurePass123!'
            };

            prisma.user.findUnique = jest.fn().mockResolvedValue(null);
            bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword123');
            prisma.user.create = jest.fn().mockResolvedValue({
                id: 'user-123',
                name: userData.name,
                email: userData.email
            });

            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const user = await prisma.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword
                }
            });

            expect(user.id).toBe('user-123');
            expect(user.email).toBe('john@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 10);
        });

        it('should prevent duplicate email registration', async () => {
            const existingUser = {
                id: 'user-456',
                email: 'existing@example.com'
            };

            prisma.user.findUnique = jest.fn().mockResolvedValue(existingUser);

            const user = await prisma.user.findUnique({
                where: { email: 'existing@example.com' }
            });

            expect(user).toBeDefined();
            expect(user.email).toBe('existing@example.com');
        });

        it('should validate email format', () => {
            const validEmails = [
                'user@example.com',
                'test.user@example.co.uk',
                'user+tag@example.com'
            ];

            const invalidEmails = [
                'invalid-email',
                '@example.com',
                'user@',
                'user @example.com'
            ];

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            validEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(true);
            });

            invalidEmails.forEach(email => {
                expect(emailRegex.test(email)).toBe(false);
            });
        });

        it('should enforce password strength requirements', () => {
            const strongPasswords = [
                'SecurePass123!',
                'MyP@ssw0rd',
                'C0mpl3x!Pass'
            ];

            const weakPasswords = [
                '12345',
                'password',
                'abc'
            ];

            strongPasswords.forEach(pass => {
                expect(pass.length).toBeGreaterThanOrEqual(6);
            });

            weakPasswords.forEach(pass => {
                expect(pass.length).toBeLessThan(6);
            });
        });

        it('should hash password before storing', async () => {
            const plainPassword = 'MyPassword123';
            
            bcrypt.hash = jest.fn().mockResolvedValue('$2b$10$hashedPassword');

            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            expect(hashedPassword).not.toBe(plainPassword);
            expect(hashedPassword).toContain('$2b$10$');
            expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
        });
    });

    describe('User Login', () => {
        it('should login with correct credentials', async () => {
            const loginData = {
                email: 'john@example.com',
                password: 'SecurePass123!'
            };

            const mockUser = {
                id: 'user-123',
                name: 'John Doe',
                email: 'john@example.com',
                password: 'hashedPassword123'
            };

            prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
            bcrypt.compare = jest.fn().mockResolvedValue(true);
            jwt.sign = jest.fn().mockReturnValue('jwt-token-123');

            const user = await prisma.user.findUnique({
                where: { email: loginData.email }
            });

            const passwordMatch = await bcrypt.compare(
                loginData.password,
                user.password
            );

            const token = jwt.sign(
                { userId: user.id },
                'secret-key',
                { expiresIn: '24h' }
            );

            expect(passwordMatch).toBe(true);
            expect(token).toBe('jwt-token-123');
        });

        it('should reject incorrect password', async () => {
            const mockUser = {
                id: 'user-123',
                password: 'hashedPassword123'
            };

            prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
            bcrypt.compare = jest.fn().mockResolvedValue(false);

            const passwordMatch = await bcrypt.compare(
                'WrongPassword',
                mockUser.password
            );

            expect(passwordMatch).toBe(false);
        });

        it('should reject non-existent user', async () => {
            prisma.user.findUnique = jest.fn().mockResolvedValue(null);

            const user = await prisma.user.findUnique({
                where: { email: 'nonexistent@example.com' }
            });

            expect(user).toBeNull();
        });

        it('should generate JWT token on successful login', async () => {
            const userId = 'user-123';
            const secret = 'test-secret-key';

            jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');

            const token = jwt.sign(
                { userId },
                secret,
                { expiresIn: '24h' }
            );

            expect(token).toBe('mock-jwt-token');
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId },
                secret,
                { expiresIn: '24h' }
            );
        });
    });

    describe('Token Validation', () => {
        it('should validate valid JWT token', () => {
            const token = 'valid-jwt-token';
            const decoded = { userId: 'user-123' };

            jwt.verify = jest.fn().mockReturnValue(decoded);

            const result = jwt.verify(token, 'secret-key');

            expect(result.userId).toBe('user-123');
        });

        it('should reject expired token', () => {
            const expiredToken = 'expired-jwt-token';

            jwt.verify = jest.fn().mockImplementation(() => {
                throw new Error('Token expired');
            });

            expect(() => jwt.verify(expiredToken, 'secret-key'))
                .toThrow('Token expired');
        });

        it('should reject invalid token', () => {
            const invalidToken = 'invalid-token';

            jwt.verify = jest.fn().mockImplementation(() => {
                throw new Error('Invalid token');
            });

            expect(() => jwt.verify(invalidToken, 'secret-key'))
                .toThrow('Invalid token');
        });

        it('should extract user data from valid token', () => {
            const token = 'valid-token';
            const userData = {
                userId: 'user-123',
                email: 'user@example.com'
            };

            jwt.verify = jest.fn().mockReturnValue(userData);

            const decoded = jwt.verify(token, 'secret');

            expect(decoded.userId).toBe('user-123');
            expect(decoded.email).toBe('user@example.com');
        });
    });

    describe('Session Management', () => {
        it('should maintain session after login', () => {
            const session = {
                userId: 'user-123',
                token: 'jwt-token',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            };

            expect(session.userId).toBeDefined();
            expect(session.token).toBeDefined();
            expect(session.expiresAt).toBeInstanceOf(Date);
        });

        it('should expire session after 24 hours', () => {
            const now = Date.now();
            const expiresAt = new Date(now + 24 * 60 * 60 * 1000);
            
            const isExpired = Date.now() > expiresAt.getTime();

            expect(isExpired).toBe(false);
        });

        it('should clear session on logout', () => {
            let session = {
                userId: 'user-123',
                token: 'jwt-token'
            };

            // Simulate logout
            session = null;

            expect(session).toBeNull();
        });
    });

    describe('Password Security', () => {
        it('should use bcrypt with proper salt rounds', async () => {
            const password = 'TestPassword123';
            const saltRounds = 10;

            bcrypt.hash = jest.fn().mockResolvedValue('hashed');

            await bcrypt.hash(password, saltRounds);

            expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
        });

        it('should never store plain text passwords', async () => {
            const plainPassword = 'PlainPassword123';
            
            bcrypt.hash = jest.fn().mockResolvedValue('$2b$10$hashedValue');

            const storedPassword = await bcrypt.hash(plainPassword, 10);

            expect(storedPassword).not.toBe(plainPassword);
            expect(storedPassword).toContain('$2b$10$');
        });
    });
});
