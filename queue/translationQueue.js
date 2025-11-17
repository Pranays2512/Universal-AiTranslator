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

// Dead Letter Queue for permanently failed jobs
const deadLetterQueue = new Queue('translation:failed', {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: false,  // Keep failed jobs for review
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
    console.log(`✓ Job ${job.id} completed successfully`);
});

translationQueue.on('failed', async (job, err) => {
    console.error(`✗ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
    
    // If all retries exhausted, move to DLQ
    if (job.attemptsMade >= job.opts.attempts) {
        console.log(`→ Moving job ${job.id} to Dead Letter Queue`);
        
        await deadLetterQueue.add('permanently-failed', {
            originalJobId: job.id,
            originalJobData: job.data,
            error: {
                message: err.message,
                stack: err.stack,
                name: err.name
            },
            attemptsMade: job.attemptsMade,
            failedAt: new Date().toISOString(),
            processedOn: job.processedOn,
            finishedOn: job.finishedOn
        }, {
            removeOnComplete: false,
            removeOnFail: false,
            jobId: `dlq-${job.id}`
        });
        
        // Optionally notify admin/user
        console.error(`⚠️  PERMANENT FAILURE: Job ${job.id} moved to DLQ`);
    }
});

translationQueue.on('stalled', (job) => {
    console.warn(`⏸  Job ${job.id} stalled`);
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
    const [waiting, active, completed, failed, dlqCount] = await Promise.all([
        translationQueue.getWaitingCount(),
        translationQueue.getActiveCount(),
        translationQueue.getCompletedCount(),
        translationQueue.getFailedCount(),
        deadLetterQueue.getCompletedCount()
    ]);
    
    return { 
        waiting, 
        active, 
        completed, 
        failed,
        deadLetterQueue: dlqCount
    };
}

// Get failed jobs from DLQ for review
async function getFailedJobs(limit = 50) {
    const jobs = await deadLetterQueue.getCompleted(0, limit - 1);
    return jobs.map(job => ({
        id: job.id,
        originalJobId: job.data.originalJobId,
        userId: job.data.originalJobData?.userId,
        text: job.data.originalJobData?.text,
        error: job.data.error.message,
        failedAt: job.data.failedAt,
        attemptsMade: job.data.attemptsMade
    }));
}

// Retry job from DLQ
async function retryFailedJob(dlqJobId) {
    const jobs = await deadLetterQueue.getCompleted();
    const dlqJob = jobs.find(j => j.id === dlqJobId);
    
    if (!dlqJob) {
        throw new Error('Job not found in DLQ');
    }
    
    // Re-add to main queue
    const newJob = await translationQueue.add(dlqJob.data.originalJobData, {
        priority: 1, // High priority for retries
        jobId: `retry-${Date.now()}`
    });
    
    console.log(`♻️  Retrying job ${dlqJobId} as ${newJob.id}`);
    return newJob;
}

// Clean old DLQ jobs (optional - run periodically)
async function cleanOldDLQJobs(daysOld = 30) {
    const jobs = await deadLetterQueue.getCompleted();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let cleaned = 0;
    for (const job of jobs) {
        const failedAt = new Date(job.data.failedAt);
        if (failedAt < cutoffDate) {
            await job.remove();
            cleaned++;
        }
    }
    
    console.log(`🧹 Cleaned ${cleaned} old DLQ jobs`);
    return cleaned;
}

module.exports = {
    translationQueue,
    deadLetterQueue,
    addTranslationJob,
    getQueueStats,
    getFailedJobs,
    retryFailedJob,
    cleanOldDLQJobs
};
