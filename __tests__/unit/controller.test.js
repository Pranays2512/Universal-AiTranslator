// Mock dependencies
jest.mock("@prisma/client", () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock_token"),
}));

const { signUp, signIn } = require("../../controller/controller");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();

describe("Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("signUp", () => {
    it("should create a new user successfully", async () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      await signUp(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User created successfully",
        user: expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
        }),
      });
    });

    it("should return 400 if email already exists", async () => {
      req.body = {
        name: "John Doe",
        email: "existing@example.com",
        password: "password123",
      };

      prisma.user.findUnique.mockResolvedValue({
        email: "existing@example.com",
      });

      await signUp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email already in use",
      });
    });
  });

  describe("signIn", () => {
    it("should sign in user successfully", async () => {
      req.body = {
        email: "john@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user123",
        name: "John Doe",
        email: "john@example.com",
        password: "hashedPassword",
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await signIn(req, res);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedPassword"
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: "user123" },
        expect.any(String),
        { expiresIn: "24h" }
      );
      expect(res.json).toHaveBeenCalledWith({
        message: "Login successful",
        token: "mock_token",
        user: expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
        }),
      });
    });

    it("should return 401 if user not found", async () => {
      req.body = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      prisma.user.findUnique.mockResolvedValue(null);

      await signIn(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid email or password",
      });
    });

    it("should return 401 if password is incorrect", async () => {
      req.body = {
        email: "john@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        id: "user123",
        email: "john@example.com",
        password: "hashedPassword",
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await signIn(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid email or password",
      });
    });

    it("should handle validation errors for missing email", async () => {
      req.body = {
        name: "John Doe",
        password: "password123",
        // missing email
      };

      await signIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should handle database errors gracefully", async () => {
      req.body = {
        email: "john@example.com",
        password: "password123",
      };

      prisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      await signIn(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should return user data on successful authentication", async () => {
      req.body = {
        email: "john@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user123",
        email: "john@example.com",
        password: "hashedPassword",
        name: "John Doe",
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("auth_token");

      await signIn(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
