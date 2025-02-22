import { monitorMiddleware } from '../../middleware/monitor';
import { Context } from 'koa';

describe('Monitor Middleware', () => {
  let ctx: Partial<Context> & { method: string; path: string; status: number; state: Record<string, any>; set: jest.Mock };
  let next: jest.Mock;
  let startTime: number;

  beforeEach(() => {
    startTime = Date.now();
    ctx = {
      method: 'GET',
      path: '/test',
      status: 200,
      state: {},
      set: jest.fn()
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
});