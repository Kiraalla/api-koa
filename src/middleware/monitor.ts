import { Context, Next } from 'koa';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

// 声明全局变量类型扩展
declare global {
  var activeConnections: number;
}

// 初始化全局变量
if (typeof global.activeConnections === 'undefined') {
  global.activeConnections = 0;
}

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
  cpuUsage: {
    user: number;
    system: number;
  };
  requestQueueSize: number;
  systemLoad: number[];
  concurrentRequests: number;
  networkIO: {
    bytesRead: number;
    bytesWritten: number;
  };
  gcMetrics?: {
    totalCollections: number;
    totalPause: number;
    avgPause: number;
  };
}

interface TimeWindowStats {
  count: number;
  totalResponseTime: number;
  maxResponseTime: number;
  errorCount: number;
  timestamp: number;
}

export const monitorMiddleware = async (ctx: Context, next: Next) => {
  const start = performance.now();
  ctx.state.requestStartTime = Date.now();

  try {
    await next();
  } finally {
    const responseTime = Math.round(performance.now() - start);
    ctx.set('X-Response-Time', `${responseTime}ms`);

    // 记录请求指标
    const metrics: RequestMetrics = {
      path: ctx.path,
      method: ctx.method,
      statusCode: ctx.status,
      responseTime,
      timestamp: Date.now(),
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      },
      cpuUsage: process.cpuUsage(),
      requestQueueSize: ctx.app.listenerCount('request') || 0,
      systemLoad: require('os').loadavg(), // 获取1分钟、5分钟、15分钟的系统负载
      concurrentRequests: (global as any).activeConnections || 0, // 使用全局变量跟踪并发连接数
      networkIO: {
        bytesRead: 0,
        bytesWritten: 0
      }
    };

    logger.info('Request metrics', metrics);
  }
};

class PerformanceMonitor {
  private static timeWindows: Map<string, TimeWindowStats> = new Map();
  private static readonly WINDOW_SIZE_MS = 60000; // 1分钟时间窗口
  private static readonly WINDOW_COUNT = 60; // 保留60个时间窗口（1小时）
  private static readonly ALERT_THRESHOLD_MS = 1000; // 响应时间告警阈值：1秒
  private static readonly MEMORY_THRESHOLD = 0.95; // 内存使用率告警阈值：95%
  private static readonly CPU_THRESHOLD = 0.90; // CPU使用率告警阈值：90%
  private static readonly ERROR_RATE_THRESHOLD = 0.05; // 错误率告警阈值：5%
  private static readonly CONCURRENT_REQUESTS_THRESHOLD = 1000; // 并发请求数告警阈值

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

    // 检查各项指标是否需要发出告警
    // 响应时间告警
    if (metric.responseTime > this.ALERT_THRESHOLD_MS) {
      logger.warn(`性能告警: ${metric.path} 响应时间 ${metric.responseTime}ms 超过阈值`);
    }

    // 内存使用率告警
    const memoryUsage = metric.memoryUsage.heapUsed / metric.memoryUsage.heapTotal;
    const rssUsage = metric.memoryUsage.rss / (require('os').totalmem());
    if (memoryUsage > this.MEMORY_THRESHOLD) {
      logger.warn(`内存告警: 当前内存使用率 ${(memoryUsage * 100).toFixed(2)}% 超过阈值`);
    }

    // CPU使用率告警
    const cpuUsagePercent = (metric.cpuUsage.user + metric.cpuUsage.system) / (process.uptime() * 1000);
    if (cpuUsagePercent > this.CPU_THRESHOLD) {
      logger.warn(`CPU告警: 当前CPU使用率超过阈值`);
    }

    // 错误率告警
    const errorRate = windowStats.errorCount / windowStats.count;
    if (errorRate > this.ERROR_RATE_THRESHOLD) {
      logger.warn(`错误率告警: 当前错误率 ${(errorRate * 100).toFixed(2)}% 超过阈值`);
    }

    // 并发请求数告警
    if (metric.concurrentRequests > this.CONCURRENT_REQUESTS_THRESHOLD) {
      logger.warn(`并发告警: 当前并发请求数 ${metric.concurrentRequests} 超过阈值`);
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
  // 只在非静态资源路径上进行详细监控
  const isStaticPath = ctx.path.startsWith('/static/') || ctx.path.startsWith('/assets/');
  const isMonitorPath = ctx.path.startsWith('/api/monitor');
  const isHealthCheckPath = ctx.path === '/health' || ctx.path === '/healthcheck';
  
  // 对监控API、静态资源路径和健康检查路径使用轻量级监控
  if (isStaticPath || isMonitorPath || isHealthCheckPath) {
    const start = performance.now();
    try {
      await next();
    } finally {
      const responseTime = performance.now() - start;
      ctx.set('X-Response-Time', `${responseTime}ms`);
    }
    return;
  }
  
  const start = performance.now();
  const startMemory = process.memoryUsage();
  const startCpu = process.cpuUsage();

  try {
    await next();
  } finally {
    // 采样率控制，只记录部分请求的详细指标
    const shouldSample = Math.random() < 0.1; // 10%采样率
    
    const responseTime = performance.now() - start;
    
    // 对所有请求都设置响应时间头
    ctx.set('X-Response-Time', `${responseTime}ms`);
    
    // 只对采样请求收集详细指标
    if (shouldSample) {
      const endMemory = process.memoryUsage();
      const endCpu = process.cpuUsage(startCpu);

      const metric: RequestMetrics = {
        path: ctx.path,
        method: ctx.method,
        statusCode: ctx.status,
        responseTime,
        timestamp: Date.now(),
        memoryUsage: {
          heapUsed: endMemory.heapUsed,
          heapTotal: endMemory.heapTotal,
          external: endMemory.external,
          rss: endMemory.rss
        },
        cpuUsage: {
          user: endCpu.user,
          system: endCpu.system
        },
        requestQueueSize: ctx.app.listenerCount('request') || 0,
        systemLoad: require('os').loadavg(),
        concurrentRequests: (global as any).activeConnections || 0,
        networkIO: {
          bytesRead: process.memoryUsage().external - startMemory.external,
          bytesWritten: ctx.response.length !== undefined ? ctx.response.length : 0
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
}

export { PerformanceMonitor };
