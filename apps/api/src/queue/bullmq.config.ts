import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { env } from '../config/env';

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const sharedJobOptions = {
  removeOnComplete: false,
  removeOnFail: false,
};

export const deliveryQueue = new Queue('delivery', {
  connection: redisConnection,
  defaultJobOptions: {
    ...sharedJobOptions,
    attempts: 6,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },
});

export const auditQueue = new Queue('audit', {
  connection: redisConnection,
  defaultJobOptions: {
    ...sharedJobOptions,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 500,
    },
  },
});
