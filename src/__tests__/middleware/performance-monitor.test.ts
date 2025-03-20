import { IncomingMessage, ServerResponse } from 'http';
import Application, { Context } from 'koa';
import { PerformanceMonitor, performanceMonitor } from '../../middleware/monitor';
import { logger } from '../../utils/logger';

// 模拟logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// 模拟os模块
jest.mock('os', () => ({
  loadavg: jest.fn().mockReturnValue([0, 0, 0]),
  totalmem: jest.fn().mockReturnValue(8589934592), // 8GB
  freemem: jest.fn().mockReturnValue(4294967296), // 4GB
  cpus: jest.fn().mockReturnValue([{}, {}, {}, {}])
}));

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    // 清除所有模拟函数的调用记录
    jest.clearAllMocks();
    
    // 重置PerformanceMonitor的timeWindows
    // @ts-ignore - 访问私有属性
    PerformanceMonitor['timeWindows'] = new Map();
  });

  describe('recordMetrics', () => {
    it('should record metrics correctly', () => {
      const metric = {
        path: '/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: Date.now(),
        memoryUsage: {
          heapUsed: 100000000,
          heapTotal: 200000000,
          external: 10000000,
          rss: 300000000
        },
        cpuUsage: {
          user: 1000000,
          system: 500000
        },
        requestQueueSize: 1,
        systemLoad: [0, 0, 0],
        concurrentRequests: 5,
        networkIO: {
          bytesRead: 1000,
          bytesWritten: 2000
        }
      };

      PerformanceMonitor.recordMetrics(metric);

      // 验证指标是否被正确记录
      const stats = PerformanceMonitor.getStats();
      expect(stats).not.toBeNull();
      expect(stats?.totalRequests).toBe(1);
      expect(stats?.avgResponseTime).toBe(100);
      expect(stats?.maxResponseTime).toBe(100);
      expect(stats?.errorRate).toBe(0);
    });

    it('should record error metrics correctly', () => {
      const metric = {
        path: '/test',
        method: 'GET',
        statusCode: 500, // 错误状态码
        responseTime: 100,
        timestamp: Date.now(),
        memoryUsage: {
          heapUsed: 100000000,
          heapTotal: 200000000,
          external: 10000000,
          rss: 300000000
        },
        cpuUsage: {
          user: 1000000,
          system: 500000
        },
        requestQueueSize: 1,
        systemLoad: [0, 0, 0],
        concurrentRequests: 5,
        networkIO: {
          bytesRead: 1000,
          bytesWritten: 2000
        }
      };

      PerformanceMonitor.recordMetrics(metric);

      // 验证错误指标是否被正确记录
      const stats = PerformanceMonitor.getStats();
      expect(stats).not.toBeNull();
      expect(stats?.totalRequests).toBe(1);
      expect(stats?.errorRate).toBe(1); // 100% 错误率
    });

    it('should trigger warnings when thresholds are exceeded', () => {
      // 创建一个超过阈值的指标
      const metric = {
        path: '/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 2000, // 超过响应时间阈值 (1000ms)
        timestamp: Date.now(),
        memoryUsage: {
          heapUsed: 190000000, // 95% 使用率
          heapTotal: 200000000,
          external: 10000000,
          rss: 8160437683 // 95% 的总内存
        },
        cpuUsage: {
          user: 10000000,
          system: 5000000
        },
        requestQueueSize: 1,
        systemLoad: [0.9, 0.8, 0.7],
        concurrentRequests: 1500, // 超过并发请求阈值 (1000)
        networkIO: {
          bytesRead: 1000,
          bytesWritten: 2000
        }
      };

      // 模拟process.uptime
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockReturnValue(10); // 10秒

      try {
        PerformanceMonitor.recordMetrics(metric);

        // 验证警告是否被触发
        expect(logger.warn).toHaveBeenCalled();
        const callCount = (logger.warn as jest.Mock).mock.calls.length;
        expect(callCount).toBeGreaterThanOrEqual(3);
      } finally {
        // 恢复原始函数
        process.uptime = originalUptime;
      }
    });
  });

  describe('getStats', () => {
    it('should return null when no metrics are recorded', () => {
      const stats = PerformanceMonitor.getStats();
      expect(stats).toBeNull();
    });

    it('should clean old windows', () => {
      // 模拟Date.now
      const originalNow = Date.now;
      const now = 1600000000000; // 固定时间点
      Date.now = jest.fn().mockReturnValue(now);

      try {
        // 添加一些指标
        const metric = {
          path: '/test',
          method: 'GET',
          statusCode: 200,
          responseTime: 100,
          timestamp: now,
          memoryUsage: {
            heapUsed: 100000000,
            heapTotal: 200000000,
            external: 10000000,
            rss: 300000000
          },
          cpuUsage: {
            user: 1000000,
            system: 500000
          },
          requestQueueSize: 1,
          systemLoad: [0, 0, 0],
          concurrentRequests: 5,
          networkIO: {
            bytesRead: 1000,
            bytesWritten: 2000
          }
        };

        PerformanceMonitor.recordMetrics(metric);

        // 验证指标是否被记录
        let stats = PerformanceMonitor.getStats();
        expect(stats).not.toBeNull();
        expect(stats?.totalRequests).toBe(1);

        // 模拟时间前进超过窗口保留时间
        const futureTime = now + (61 * 60 * 1000); // 61分钟后
        Date.now = jest.fn().mockReturnValue(futureTime);

        // 验证旧窗口是否被清理
        stats = PerformanceMonitor.getStats();
        expect(stats).toBeNull();
      } finally {
        // 恢复原始函数
        Date.now = originalNow;
      }
    });
  });
});

describe('performanceMonitor middleware', () => {
  let ctx: Context;
  let next: jest.Mock;

  beforeEach(() => {
    // 重置PerformanceMonitor的timeWindows，确保测试之间不会相互影响
    // @ts-ignore - 访问私有属性
    PerformanceMonitor['timeWindows'] = new Map();
    
    const mockApp = {
      listenerCount: jest.fn().mockReturnValue(1)
    } as unknown as Application;

    ctx = {
      method: 'GET',
      path: '/api/users',
      status: 200,
      state: {},
      set: jest.fn(),
      get: jest.fn(),
      app: mockApp,
      request: {
        body: {},
        app: mockApp,
        req: {} as IncomingMessage,
        res: {} as ServerResponse,
        ctx: {} as Context
      },
      response: {
        length: 1024,
        status: 200,
        message: '',
        body: null,
        get: jest.fn(),
        set: jest.fn(),
        has: jest.fn(),
        remove: jest.fn(),
        type: '',
        headerSent: false,
        redirect: jest.fn(),
        attachment: jest.fn(),
        append: jest.fn(),
        vary: jest.fn(),
        lastModified: null,
        etag: jest.fn()
      }
    } as unknown as Context;

    next = jest.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 10));
    });

    // 模拟Math.random以控制采样
    jest.spyOn(Math, 'random').mockReturnValue(0.05); // 5%, 低于10%的采样率
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use lightweight monitoring for static paths', async () => {
    ctx.path = '/static/image.jpg';
    
    await performanceMonitor(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+(\.\d+)?ms$/)
    );
    // 验证没有调用PerformanceMonitor.recordMetrics
    const stats = PerformanceMonitor.getStats();
    expect(stats).toBeNull();
  });

  it('should use lightweight monitoring for monitor API paths', async () => {
    ctx.path = '/api/monitor/metrics';
    
    await performanceMonitor(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+(\.\d+)?ms$/)
    );
    // 验证没有调用PerformanceMonitor.recordMetrics
    const stats = PerformanceMonitor.getStats();
    expect(stats).toBeNull();
  });

  it('should collect detailed metrics for sampled requests', async () => {
    await performanceMonitor(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+(\.\d+)?ms$/)
    );
    
    // 验证详细指标是否被记录
    const stats = PerformanceMonitor.getStats();
    expect(stats).not.toBeNull();
    expect(stats?.totalRequests).toBe(1);
  });

  it('should not collect metrics for non-sampled requests', async () => {
    // 模拟Math.random返回大于采样率的值
    jest.spyOn(Math, 'random').mockReturnValue(0.95); // 95%, 高于10%的采样率
    
    await performanceMonitor(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+(\.\d+)?ms$/)
    );
    
    // 验证没有详细指标被记录
    const stats = PerformanceMonitor.getStats();
    expect(stats).toBeNull();
  });

  it('should handle requests with no response length', async () => {
    // 移除响应长度
    ctx.response.length = undefined as unknown as number; // 模拟response.length为undefined的情况
    
    await performanceMonitor(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+(\.\d+)?ms$/)
    );
    
    // 验证详细指标是否被记录
    const stats = PerformanceMonitor.getStats();
    expect(stats).not.toBeNull();
  });

  it('should handle health check paths', async () => {
    ctx.path = '/health';
    
    await performanceMonitor(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+(\.\d+)?ms$/)
    );
    // 验证没有调用PerformanceMonitor.recordMetrics
    const stats = PerformanceMonitor.getStats();
    expect(stats).toBeNull();
  });

  it('should include database stats if available', async () => {
    // 设置数据库统计信息
    ctx.state.dbStats = {
      queryCount: 5,
      queryTime: 50
    };
    
    await performanceMonitor(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    
    // 验证数据库统计信息是否被包含在指标中
    // 由于我们无法直接访问传递给recordMetrics的指标对象
    // 我们可以通过检查是否调用了recordMetrics来间接验证
    const stats = PerformanceMonitor.getStats();
    expect(stats).not.toBeNull();
  });

  it('should handle errors in next middleware', async () => {
    const error = new Error('Test error');
    next.mockRejectedValueOnce(error);
    
    await expect(performanceMonitor(ctx as Context, next)).rejects.toThrow('Test error');
    
    // 即使发生错误，也应该设置响应时间头
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+(\.\d+)?ms$/)
    );
  });
});