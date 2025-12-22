const {
  checkSignUp,
  checkSignIn,
  checkUser,
} = require("../../middleware/middleware");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

/**
 * Middleware Test Suite
 *
 * Tests validation and authentication middleware functions:
 * - checkSignUp: Validates user registration data
 * - checkSignIn: Validates user login data
 * - checkUser: Verifies JWT token and user authentication
 */

// Mock PrismaClient
jest.mock("@prisma/client", () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

const mockPrisma = new PrismaClient();

describe("Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("checkSignUp", () => {
    it("should call next() when all fields are valid", () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        confirmPassword: "password123",
      };

      checkSignUp(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 400 if any field is missing", () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
      };

      checkSignUp(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "All fields are required",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 if password is too short", () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        password: "123",
        confirmPassword: "123",
      };

      checkSignUp(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password must be at least 6 characters long",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 if passwords do not match", () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        confirmPassword: "different123",
      };

      checkSignUp(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Passwords do not match",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("checkSignIn", () => {
    it("should call next() when email and password are provided", () => {
      req.body = {
        email: "john@example.com",
        password: "password123",
      };

      checkSignIn(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 400 if email is missing", () => {
      req.body = {
        password: "password123",
      };

      checkSignIn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email and password are required",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 if password is missing", () => {
      req.body = {
        email: "john@example.com",
      };

      checkSignIn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email and password are required",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("checkUser", () => {
    const JWT_SECRET =
      process.env.JWT_SECRET ||
      "9f4a7d3a4c0e8a7d1d61caa42a87dfc1454c1a2c19f7075e69f49c842dbd8c3c";

    it("should call next() with valid token and existing user", async () => {
      const token = jwt.sign({ userId: "user123" }, JWT_SECRET);
      req.headers["authorization"] = `Bearer ${token}`;

      const mockUser = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await checkUser(req, res, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user123" },
      });
      expect(req.currentUser).toEqual({
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
      });
      expect(next).toHaveBeenCalled();
    });

    it("should return 401 if authorization header is missing", async () => {
      await checkUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "You must be logged in to translate",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is missing", async () => {
      req.headers["authorization"] = "Bearer ";

      await checkUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "You must be logged in to translate",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is invalid", async () => {
      req.headers["authorization"] = "Bearer invalidtoken";

      await checkUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired token",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if user is not found", async () => {
      const token = jwt.sign({ userId: "nonexistent" }, JWT_SECRET);
      req.headers["authorization"] = `Bearer ${token}`;

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await checkUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
