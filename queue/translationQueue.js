const Queue = require('bull');
const translate = require('google-translate-api-x');
const { redisConfig } = require('../config/redis.js');

// Create translation queue
const translationQueue = new Queue('translation', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

// Process translation jobs
translationQueue.process(async (job) => {
    const { text, targetLang, userId, socketId } = job.data;
    
    console.log(`Processing translation job ${job.id} for user ${userId}`);
    
    try {
        const result = await translate(text, { to: targetLang });
        
        return {
            translatedText: result.text,
            detectedLanguage: result.from?.language?.iso || 'unknown',
            userId,
            socketId
        };
    } catch (error) {
        console.error(`Translation job ${job.id} failed:`, error);
        throw error;
    }
});

// Queue event listeners
translationQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed successfully`);
});

translationQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
});

translationQueue.on('stalled', (job) => {
    console.warn(`Job ${job.id} stalled`);
});

// Add method to add translation job
async function addTranslationJob(data) {
    const job = await translationQueue.add(data, {
        priority: data.priority || 5,
        jobId: `${data.userId}-${Date.now()}`
    });
    
    return job;
}

// Get queue stats
async function getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
        translationQueue.getWaitingCount(),
        translationQueue.getActiveCount(),
        translationQueue.getCompletedCount(),
        translationQueue.getFailedCount()
    ]);
    
    return { waiting, active, completed, failed };
}

module.exports = {
    translationQueue,
    addTranslationJob,
    getQueueStats
};