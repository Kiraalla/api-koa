import { Redis } from 'ioredis';
import { logger } from './logger';
import { BloomFilter } from 'bloom-filters';
import { promisify } from 'util';

class CacheManager {
  private redis: Redis;
  private defaultTTL: number = 3600; // 默认缓存时间1小时
  private bloomFilter: BloomFilter;
  private warmupInProgress: boolean = false;
  private localCache: Map<string, { value: any; expiry: number }> = new Map(); // 本地内存缓存
  private localCacheTTL: number = 300; // 本地缓存默认5分钟

  constructor() {
    // 初始化布隆过滤器
    this.bloomFilter = new BloomFilter(10000, 0.01); // 预期元素数量10000，错误率0.01
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB) || 0,
    });

    this.redis.on('error', (error: Error) => {
      logger.error('Redis连接错误:', error);
    });
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      // 1. 添加到布隆过滤器
      this.bloomFilter.add(key);

      // 2. 序列化值
      const serializedValue = JSON.stringify(value);

      // 3. 设置Redis缓存
      await this.redis.setex(key, ttl, serializedValue);

      // 4. 更新本地缓存
      this.localCache.set(key, {
        value,
        expiry: Date.now() + Math.min(ttl * 1000, this.localCacheTTL * 1000)
      });
    } catch (error: unknown) {
      logger.error(`设置缓存失败 [${key}]:`, error);
      throw error;
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // 1. 检查布隆过滤器
      if (!this.bloomFilter.has(key)) {
        return null;
      }

      // 2. 检查本地缓存
      const localData = this.localCache.get(key);
      if (localData && localData.expiry > Date.now()) {
        logger.debug(`本地缓存命中 [${key}]`);
        return localData.value as T;
      }

      // 3. 检查Redis缓存
      const value = await this.redis.get(key);
      if (!value) return null;

      // 4. 更新本地缓存
      const parsedValue = JSON.parse(value) as T;
      this.localCache.set(key, {
        value: parsedValue,
        expiry: Date.now() + this.localCacheTTL * 1000
      });

      return parsedValue;
    } catch (error: unknown) {
      logger.error(`获取缓存失败 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    try {
      // 1. 删除Redis缓存
      await this.redis.del(key);
      // 2. 删除本地缓存
      this.localCache.delete(key);
    } catch (error: unknown) {
      logger.error(`删除缓存失败 [${key}]:`, error);
      throw error;
    }
  }

  /**
   * 清除指定模式的所有缓存
   * @param pattern 模式，如：user:*
   */
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error: unknown) {
      logger.error(`清除缓存模式失败 [${pattern}]:`, error);
      throw error;
    }
  }
  /**
   * 缓存预热
   * @param keys 需要预热的键列表
   * @param fetchData 获取数据的函数
   */
  async warmup<T>(keys: string[], fetchData: (key: string) => Promise<T>): Promise<void> {
    if (this.warmupInProgress) {
      logger.warn('缓存预热正在进行中');
      return;
    }

    try {
      this.warmupInProgress = true;
      logger.info(`开始缓存预热，共${keys.length}个键`);

      const batchSize = 100; // 每批处理的键数量
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (key) => {
            try {
              const data = await fetchData(key);
              if (data) {
                await this.set(key, data);
                this.bloomFilter.add(key);
              }
            } catch (error) {
              logger.error(`缓存预热失败 [${key}]:`, error);
            }
          })
        );
      }

      logger.info('缓存预热完成');
    } catch (error) {
      logger.error('缓存预热过程发生错误:', error);
    } finally {
      this.warmupInProgress = false;
    }
  }

  /**
   * 获取缓存状态
   */
  async getStatus(): Promise<object> {
    const info = await promisify(this.redis.info).bind(this.redis)();
    return {
      redisInfo: info,
      bloomFilterSize: this.bloomFilter.size,
      warmupInProgress: this.warmupInProgress
    };
  }
}

export const cacheManager = new CacheManager();