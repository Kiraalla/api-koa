import { Context, Next } from 'koa';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  dbQueryCount?: number;
  dbQueryTime?: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

interface TimeWindowStats {
  count: number;
  totalResponseTime: number;
  maxResponseTime: number;
  errorCount: number;
  timestamp: number;
}

class PerformanceMonitor {
  private static timeWindows: Map<string, TimeWindowStats> = new Map();
  private static readonly WINDOW_SIZE_MS = 60000; // 1分钟时间窗口
  private static readonly WINDOW_COUNT = 60; // 保留60个时间窗口（1小时）
  private static readonly ALERT_THRESHOLD_MS = 1000; // 响应时间告警阈值：1秒

  /**
   * 记录性能指标
   */
  private static getCurrentWindowKey(): string {
    const now = Date.now();
    return Math.floor(now / this.WINDOW_SIZE_MS).toString();
  }

  private static cleanOldWindows(): void {
    const now = Date.now();
    const oldestAllowed = Math.floor(now / this.WINDOW_SIZE_MS) - this.WINDOW_COUNT;
    
    for (const [key, _] of this.timeWindows) {
      if (parseInt(key) < oldestAllowed) {
        this.timeWindows.delete(key);
      }
    }
  }

  static recordMetrics(metric: RequestMetrics): void {
    const windowKey = this.getCurrentWindowKey();
    let windowStats = this.timeWindows.get(windowKey);

    if (!windowStats) {
      windowStats = {
        count: 0,
        totalResponseTime: 0,
        maxResponseTime: 0,
        errorCount: 0,
        timestamp: Date.now()
      };
      this.timeWindows.set(windowKey, windowStats);
    }

    windowStats.count++;
    windowStats.totalResponseTime += metric.responseTime;
    windowStats.maxResponseTime = Math.max(windowStats.maxResponseTime, metric.responseTime);
    if (metric.statusCode >= 400) {
      windowStats.errorCount++;
    }

    // 检查是否需要发出告警
    if (metric.responseTime > this.ALERT_THRESHOLD_MS) {
      logger.warn(`性能告警: ${metric.path} 响应时间 ${metric.responseTime}ms 超过阈值`);
    }
  }

  /**
   * 获取性能指标统计
   */
  static getStats() {
    this.cleanOldWindows();
    if (this.timeWindows.size === 0) return null;

    let totalRequests = 0;
    let totalResponseTime = 0;
    let maxResponseTime = 0;
    let totalErrors = 0;

    const windows = Array.from(this.timeWindows.values());
    windows.forEach(window => {
      totalRequests += window.count;
      totalResponseTime += window.totalResponseTime;
      maxResponseTime = Math.max(maxResponseTime, window.maxResponseTime);
      totalErrors += window.errorCount;
    });

    return {
      totalRequests,
      avgResponseTime: totalResponseTime / totalRequests,
      maxResponseTime,
      errorRate: totalErrors / totalRequests,
      timeWindows: windows.sort((a, b) => b.timestamp - a.timestamp)
    };
  }
}

/**
 * 性能监控中间件
 */
export async function performanceMonitor(ctx: Context, next: Next) {
  const start = performance.now();
  const startMemory = process.memoryUsage();

  try {
    await next();
  } finally {
    const responseTime = performance.now() - start;
    const endMemory = process.memoryUsage();

    const metric: RequestMetrics = {
      path: ctx.path,
      method: ctx.method,
      statusCode: ctx.status,
      responseTime,
      timestamp: Date.now(),
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        rss: endMemory.rss
      }
    };

    // 记录数据库查询相关指标
    if (ctx.state.dbStats) {
      metric.dbQueryCount = ctx.state.dbStats.queryCount;
      metric.dbQueryTime = ctx.state.dbStats.queryTime;
    }

    PerformanceMonitor.recordMetrics(metric);
  }
}

export { PerformanceMonitor };