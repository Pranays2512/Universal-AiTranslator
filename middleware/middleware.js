+/**
+ * Authentication & authorization middleware
+ * Handles sign-up validation, sign-in validation, and JWT user verification
+ */
 const jwt = require('jsonwebtoken');
 const { PrismaClient } = require('@prisma/client');
