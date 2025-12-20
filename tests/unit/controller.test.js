// Mock dependencies before requiring the controller
const mockUser = { id: 1, name: 'Pranay', email: 'p@example.com', password: 'hashed' };

const findUnique = jest.fn();
const create = jest.fn();
const prismaMock = { user: { findUnique, create } };

// Use doMock to avoid jest.mock hoisting issues and ensure our shared mock is used
jest.doMock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock)
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token')
}));

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Require controller after mocking Prisma
const { signUp, signIn, JWT_SECRET } = require('../../controller/controller');

describe('Controller: signUp & signIn', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    jest.clearAllMocks();
  });

  it('signUp creates a new user and returns token', async () => {
    req.body = { name: 'Pranay', email: 'p@example.com', password: 'password' };

    findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed');
    create.mockResolvedValue({ id: 1, name: 'Pranay', email: 'p@example.com' });

    await signUp(req, res);

    expect(create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'signed-token' }));
  });

  it('signUp returns 409 if user exists', async () => {
    req.body = { name: 'Pranay', email: 'p@example.com', password: 'password' };
    findUnique.mockResolvedValue({ id: 1 });

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'User exists' });
  });

  it('signIn returns 404 if user not found', async () => {
    req.body = { email: 'missing@example.com', password: 'p' };
    findUnique.mockResolvedValue(null);

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  it('signIn returns 401 for invalid password', async () => {
    req.body = { email: 'p@example.com', password: 'bad' };
    findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
  });

  it('signIn returns 200 and token on success', async () => {
    req.body = { email: 'p@example.com', password: 'good' };
    findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'signed-token' }));
  });

  it('exports JWT_SECRET', () => {
    expect(typeof JWT_SECRET).toBe('string');
    expect(JWT_SECRET.length).toBeGreaterThan(10);
  });
});
