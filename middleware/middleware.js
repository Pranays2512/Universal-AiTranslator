
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../controller/controller.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function checkSignUp(req, res, next) {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    next();
}


function checkSignIn(req, res, next) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    next();
}

async function checkUser(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'You must be logged in to translate' });

    const token = authHeader.split(' ')[1]; 
    if (!token) return res.status(401).json({ message: 'You must be logged in to translate' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(401).json({ message: 'User not found' });

        req.currentUser = { id: user.id, name: user.name, email: user.email };
        next();
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
}

module.exports = { checkSignUp, checkSignIn, checkUser };
