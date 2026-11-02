import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redisConnection: Redis | null = null;
let videoRenderQueue: Queue | null = null;
let agentTaskQueue: Queue | null = null;
let isRedisAvailable = false;

// Fallback in-memory job runner when Redis is not running
const inMemoryWorkers: Map<string, (data: any) => Promise<any>> = new Map();

export async function initQueues() {
  try {
    redisConnection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis connection retry limit reached. Falling back to in-memory async processing.');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 1000);
      },
    });

    redisConnection.on('error', (err) => {
      if (!isRedisAvailable) {
        logger.warn(`Redis not available (${err.message}). Using in-memory fallback queue.`);
      }
    });

    redisConnection.on('connect', () => {
      isRedisAvailable = true;
      logger.info('Connected to Redis server for BullMQ background queues.');
      
      if (!redisConnection) return;
      // Instantiate workers for all registered handlers upon Redis connection
      for (const [qName, proc] of inMemoryWorkers.entries()) {
        try {
          new Worker(
            qName,
            async (job: Job) => {
              return await proc(job.data);
            },
            { connection: redisConnection }
          );
          logger.info(`BullMQ Worker active for queue: ${qName}`);
        } catch (err: any) {
          logger.warn(`Could not start BullMQ worker for ${qName}: ${err.message}`);
        }
      }
    });

    videoRenderQueue = new Queue('video-renders', { connection: redisConnection });
    agentTaskQueue = new Queue('agent-tasks', { connection: redisConnection });

  } catch (error) {
    logger.warn('Failed to initialize Redis connection. Utilizing in-memory queue fallback.');
    isRedisAvailable = false;
  }
}

export function registerWorker(queueName: string, processor: (data: any) => Promise<any>) {
  inMemoryWorkers.set(queueName, processor);

  if (isRedisAvailable && redisConnection) {
    try {
      new Worker(
        queueName,
        async (job: Job) => {
          return await processor(job.data);
        },
        { connection: redisConnection }
      );
      logger.info(`BullMQ Worker registered for queue: ${queueName}`);
    } catch (err) {
      logger.warn(`Could not start BullMQ worker for ${queueName}, fallback active.`);
    }
  }
}

export async function addJob(queueName: string, jobName: string, data: any) {
  if (isRedisAvailable && (queueName === 'video-renders' ? videoRenderQueue : agentTaskQueue)) {
    try {
      const q = queueName === 'video-renders' ? videoRenderQueue : agentTaskQueue;
      const job = await q!.add(jobName, data);
      return { id: job.id, isAsync: true };
    } catch (err) {
      logger.warn(`BullMQ add failed, dispatching to in-memory processor for ${queueName}`);
    }
  }

  // Resilient in-memory async dispatch
  const worker = inMemoryWorkers.get(queueName);
  if (worker) {
    setImmediate(async () => {
      try {
        await worker(data);
      } catch (err) {
        logger.error(`Error in async in-memory worker for ${queueName}:`, err);
      }
    });
    return { id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, isAsync: true };
  } else {
    logger.error(`No processor registered for queue: ${queueName}`);
    throw new Error(`Queue handler for ${queueName} not registered`);
  }
}

