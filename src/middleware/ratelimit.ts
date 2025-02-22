import { Context, Next } from 'koa';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  duration: number;  // 时间窗口大小（毫秒）
  max: number;       // 最大请求次数
  key?: string;      // 自定义键前缀
}

class RateLimiter {
  private redis: Redis;
  private defaultConfig: RateLimitConfig = {
    duration: process.env.NODE_ENV === 'test' ? 1000 : 60000,  // 测试环境1秒，生产环境1分钟
    max: process.env.NODE_ENV === 'test' ? 10 : 100,         // 测试环境10次，生产环境100次
    key: 'ratelimit' // 默认键前缀
  };

  public getDefaultConfig(): RateLimitConfig {
    return { ...this.defaultConfig };
  }

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB) || 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: process.env.NODE_ENV === 'test' ? 1 : 3,
      enableReadyCheck: true,
      connectTimeout: process.env.NODE_ENV === 'test' ? 2000 : 10000,
      lazyConnect: false
    });

    this.redis.on('error', (error: Error) => {
      logger.error('Redis连接错误:', error);
    });

    this.redis.on('ready', () => {
      logger.info('Redis连接就绪');
    });

    this.redis.on('reconnecting', () => {
      logger.warn('Redis正在重新连接...');
    });
  }

  private generateKey(identifier: string, config: RateLimitConfig): string {
    return `${config.key}:${identifier}`;
  }

  async isLimited(identifier: string, config: RateLimitConfig = this.defaultConfig): Promise<boolean> {
    const key = this.generateKey(identifier, config);
    const now = Date.now();
    const windowStart = now - config.duration;

    try {
      // 使用Redis事务保证原子性
      const multi = this.redis.multi();
      multi.zremrangebyscore(key, 0, windowStart); // 移除过期的请求记录
      multi.zadd(key, now, `${now}`); // 添加新的请求记录
      multi.zcard(key); // 获取当前时间窗口内的请求数
      multi.pexpire(key, config.duration); // 设置过期时间

      const results = await multi.exec();
      if (!results) return true;

      const requestCount = results[2][1] as number;
      return requestCount > config.max;
    } catch (error) {
      logger.error('速率限制检查失败:', error);
      if (error instanceof Error && error.message.includes('READONLY')) {
        // Redis只读错误，可能是主从切换
        await this.redis.quit();
        this.redis = new Redis(this.redis.options);
        return this.isLimited(identifier, config);
      }
      // 其他错误情况下，为了系统安全，默认限制请求
      return true;
    }
  }

  async getRemainingRequests(identifier: string, config: RateLimitConfig = this.defaultConfig): Promise<number> {
    const key = this.generateKey(identifier, config);
    const now = Date.now();
    const windowStart = now - config.duration;

    try {
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const requestCount = await this.redis.zcard(key);
      return Math.max(0, config.max - requestCount);
    } catch (error) {
      logger.error('获取剩余请求次数失败:', error);
      return 0;
    }
  }
}

const limiter = new RateLimiter();

// 中间件工厂函数
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const finalConfig: RateLimitConfig = { ...limiter.getDefaultConfig(), ...config };

  return async function rateLimiter(ctx: Context, next: Next) {
    const identifier = ctx.ip;

    // 检查是否超出限制
    const isLimited = await limiter.isLimited(identifier, finalConfig);
    if (isLimited) {
      ctx.status = 429;
      ctx.body = { error: '请求过于频繁，请稍后再试' };
      return;
    }

    // 设置响应头
    const remaining = await limiter.getRemainingRequests(identifier, finalConfig);
    ctx.set('X-RateLimit-Limit', finalConfig.max.toString());
    ctx.set('X-RateLimit-Remaining', remaining.toString());
    ctx.set('X-RateLimit-Reset', (Date.now() + finalConfig.duration).toString());

    await next();
  };
}