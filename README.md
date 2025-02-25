# Shop API 项目说明文档

## 项目概述

本项目是一个基于Koa.js和TypeScript构建的电商API服务，采用分层架构设计，支持多端适配（H5、小程序等），并实现了完整的用户、商品、订单管理功能。项目集成了链路追踪、性能监控和多级缓存等企业级特性。

## 项目架构

### 核心技术栈

- **框架**: Koa.js
- **语言**: TypeScript
- **数据库**: MySQL (通过配置支持其他数据库)
- **缓存**: Redis + 本地缓存
- **认证**: JWT (JSON Web Token)
- **监控**: 自定义性能监控系统
- **链路追踪**: 分布式追踪系统
- **API文档**: 独立的api-doc.md文件

### 分层架构

项目采用经典的分层架构，各层职责明确：

1. **路由层** (routes/)
   - 处理HTTP请求路由
   - 参数验证
   - 权限控制

2. **适配器层** (adapter/)
   - 处理多端适配逻辑
   - 支持H5和小程序等不同客户端
   - 统一接口响应格式

3. **模型层** (models/)
   - 数据模型定义
   - 数据库操作封装
   - 业务逻辑处理

4. **中间件层** (middleware/)
   - 错误处理
   - 请求速率限制
   - 参数验证
   - 性能监控
   - 链路追踪

5. **工具层** (utils/)
   - 通用工具函数
   - 认证相关功能
   - 缓存管理
   - 日志处理

## 目录结构说明

```
├── .env                 # 环境变量配置
├── api-doc.md           # API接口文档
├── logs/                # 日志文件目录
├── src/                 # 源代码目录
│   ├── __tests__/       # 测试目录
│   │   ├── middleware/  # 中间件测试
│   │   └── models/      # 模型测试
│   ├── adapter/         # 多端适配器
│   ├── config/          # 项目配置
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   ├── types/           # 类型定义
│   ├── utils/           # 工具函数
│   └── app.ts           # 应用入口
├── jest.config.ts       # Jest测试配置
├── package.json         # 项目依赖
└── tsconfig.json        # TypeScript配置
```

## 核心功能说明

### 1. 链路追踪系统

- 自动生成请求追踪ID和Span ID
- 支持分布式系统追踪
- 记录完整请求处理链路
- 通过响应头返回追踪ID

### 2. 性能监控系统

- 实时监控请求响应时间
- 内存使用情况追踪
- 数据库性能统计
- 自动性能告警机制
- 支持时间窗口统计

### 3. 多级缓存系统

- 本地内存缓存（5分钟TTL）
- Redis分布式缓存
- 布隆过滤器防止缓存穿透
- 支持缓存预热和模式化清理

### 4. 适配器模式

适配器模式用于处理不同客户端的请求差异：

- `adapter.factory.ts`: 适配器工厂，根据客户端类型创建对应适配器
- `h5.adapter.ts`: H5端适配器
- `miniprogram.adapter.ts`: 小程序适配器

### 5. 中间件

- `error.ts`: 统一错误处理
- `ratelimit.ts`: 请求速率限制
- `validator.ts`: 请求参数验证
- `monitor.ts`: 性能监控
- `tracing.ts`: 链路追踪

## 开发规范

### 1. 新功能开发流程

1. 在`models/`中定义数据模型
2. 在`routes/`中添加路由
3. 根据需要在`middleware/`中添加中间件
4. 更新`api-doc.md`文档
5. 添加必要的性能监控点
6. 实现合适的缓存策略

### 2. 性能优化指南

1. **缓存使用**
   - 合理使用多级缓存
   - 实现缓存预热
   - 防止缓存穿透

2. **数据库优化**
   - 使用合适的索引
   - 优化查询语句
   - 实现数据分页

3. **监控告警**
   - 设置合理的告警阈值
   - 及时响应性能问题
   - 定期优化性能瓶颈

### 3. 安全性考虑

- 所有敏感配置使用环境变量
- 实施请求速率限制
- 使用JWT进行身份验证
- 参数验证和转义
- 实现数据加密传输

## 注意事项

1. **环境变量**
   - 开发前复制`.env.example`为`.env`
   - 不要提交`.env`到版本控制
   - 配置Redis连接信息

2. **日志处理**
   - 错误日志记录在`logs/error.log`
   - 综合日志记录在`logs/combined.log`
   - 包含追踪ID便于问题定位

3. **性能优化**
   - 合理使用数据库索引
   - 实现多级缓存机制
   - 避免大量同步操作
   - 监控性能指标

4. **代码规范**
   - 遵循TypeScript规范
   - 使用ESLint进行代码检查
   - 编写单元测试

## 常见问题

1. **启动失败**
   - 检查环境变量配置
   - 确认数据库连接
   - 验证Redis连接
   - 查看错误日志

2. **性能问题**
   - 检查监控面板
   - 分析慢查询日志
   - 优化缓存策略
   - 调整数据库索引

3. **缓存问题**
   - 检查Redis连接
   - 验证缓存配置
   - 确认缓存策略
   - 监控缓存命中率

## 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建Pull Request

## 版本控制

使用Git进行版本控制，遵循语义化版本规范。

## 许可证

[MIT License](LICENSE)