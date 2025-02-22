import Router from '@koa/router';
import { PerformanceMonitor } from '../middleware/monitor';
import { adminAuthMiddleware } from '../utils/auth';

const router = new Router({ prefix: '/monitor' });

// 获取性能监控指标
router.get('/metrics', adminAuthMiddleware, async (ctx) => {
  const stats = PerformanceMonitor.getStats();
  
  if (!stats) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      message: '暂无监控数据',
      data: null
    };
    return;
  }

  ctx.body = {
    success: true,
    message: '获取监控数据成功',
    data: {
      ...stats,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuCount: require('os').cpus().length,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
        uptime: process.uptime()
      }
    }
  };
});

export default router;