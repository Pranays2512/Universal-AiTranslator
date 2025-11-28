const { Sequelize } = require('sequelize');

// PostgreSQL connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'universal_translator',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'your_password',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false, // Set to console.log for debugging
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Test connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✓ PostgreSQL database connected');
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
}

// Sync all models
async function syncDatabase() {
    try {
        await sequelize.sync({ alter: true });
        console.log('✓ Database tables synchronized');
    } catch (error) {
        console.error('✗ Database sync failed:', error.message);
    }
}

module.exports = {
    sequelize,
    testConnection,
    syncDatabase
};
