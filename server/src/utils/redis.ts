import Redis from 'ioredis';
import { onShutdown } from './shutdown.js';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// 注册优雅关闭
onShutdown('Redis', async () => {
  redis.disconnect();
});
