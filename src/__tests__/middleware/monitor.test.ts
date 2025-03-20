import Application, { Context } from 'koa';
import { monitorMiddleware } from '../../middleware/monitor';

// 模拟logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Monitor Middleware', () => {
  let ctx: Partial<Context> & { method: string; path: string; status: number; state: Record<string, any>; set: jest.Mock };
  let next: jest.Mock;
  let startTime: number;

  beforeEach(() => {
    startTime = Date.now();
    const mockApp = {
      listenerCount: jest.fn().mockReturnValue(1)
    } as unknown as Application;

    ctx = {
      method: 'GET',
      path: '/test',
      status: 200,
      state: {},
      set: jest.fn(),
      app: mockApp
    };
    next = jest.fn().mockImplementation(() => {
      // 模拟请求处理时间
      return new Promise(resolve => setTimeout(resolve, 10));
    });
  });

  it('should track request timing', async () => {
    await monitorMiddleware(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.state.requestStartTime).toBeDefined();
    expect(typeof ctx.state.requestStartTime).toBe('number');
    expect(ctx.state.requestStartTime).toBeGreaterThanOrEqual(startTime);
  });

  it('should set response headers with timing information', async () => {
    await monitorMiddleware(ctx as Context, next);
    
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+ms$/)
    );
  });

  it('should handle errors in next middleware', async () => {
    const error = new Error('Test error');
    next.mockRejectedValueOnce(error);
    
    await expect(monitorMiddleware(ctx as Context, next)).rejects.toThrow('Test error');
    expect(ctx.state.requestStartTime).toBeDefined();
  });

  it('should work with different HTTP methods', async () => {
    ctx.method = 'POST';
    await monitorMiddleware(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+ms$/)
    );
  });

  it('should work with different response status codes', async () => {
    ctx.status = 404;
    await monitorMiddleware(ctx as Context, next);
    
    expect(next).toHaveBeenCalled();
    expect(ctx.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+ms$/)
    );
  });
  
  // 测试CPU告警逻辑
  it('should log warning when CPU usage exceeds threshold', () => {
    // 导入监控类
    const { PerformanceMonitor } = require('../../middleware/monitor');
    const { logger } = require('../../utils/logger');
    
    // 创建监控实例
    const monitor = new PerformanceMonitor();
    
    // 模拟高CPU使用率的指标
    const highCpuMetric = {
      path: '/test',
      responseTime: 100,
      memoryUsage: {
        heapUsed: 100000000,
        heapTotal: 200000000,
        rss: 300000000
      },
      cpuUsage: {
        user: 1000000,
        system: 500000
      },
      method: 'GET',
      statusCode: 200,
      timestamp: Date.now(),
      concurrentRequests: 1,
      requestQueueSize: 1,
      systemLoad: [0, 0, 0],
      networkIO: {
        bytesRead: 0,
        bytesWritten: 0
      }
    };
    
    // 设置非常低的CPU阈值以触发告警
    monitor.CPU_THRESHOLD = 0.0001;
    
    // 调用处理指标方法
    PerformanceMonitor.recordMetrics(highCpuMetric);
    
    // 验证是否记录了CPU告警
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('CPU告警'));
  });
});