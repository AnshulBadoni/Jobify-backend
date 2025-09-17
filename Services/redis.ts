import Redis from "ioredis";

export const redisConfig = {
  host: 'findmejob-jobfinder-anshulbadoni.b.aivencloud.com',
  port: 14611,
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  tls: {},
  maxRetriesPerRequest: 1,
  retryStrategy: (times: number) => {
    return Math.min(times * 50, 2000);
  }
};

export const redis = new Redis(redisConfig);

redis.on('error', (err) => console.error('Redis Error:', err));
