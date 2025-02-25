import Router from '@koa/router';

const router = new Router();

// 根路径处理
router.get('/', async (ctx) => {
  ctx.body = {
    success: true,
    message: 'Shop API 服务正常运行中',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  };
});

// 健康检查接口
router.get('/health', async (ctx) => {
  ctx.body = {
    success: true,
    message: 'API服务健康状态正常',
    data: {
      status: 'UP',
      timestamp: new Date().toISOString()
    }
  };
});

export default router;