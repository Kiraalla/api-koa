# Shop API 接口文档

## 目录
- [认证说明](#认证说明)
- [接口响应格式](#接口响应格式)
- [速率限制](#速率限制)
- [链路追踪](#链路追踪)
- [性能监控](#性能监控)
- [缓存策略](#缓存策略)
- [用户模块](#用户模块)
  - [用户注册](#用户注册)
  - [用户登录](#用户登录)
  - [用户信息更新](#用户信息更新)
  - [密码验证](#密码验证)

## 认证说明

### JWT认证
本API使用JWT（JSON Web Token）进行身份验证。在调用需要认证的接口时，需要在请求头中添加`Authorization`字段，格式为：

```
Authorization: Bearer <token>
```

### 权限级别
系统包含三种用户角色：
- `user`: 普通用户
- `admin`: 管理员
- `guest`: 访客

某些接口需要管理员权限才能访问，请确保使用具有相应权限的账号。

## 接口响应格式

所有接口返回的数据格式统一为：

```json
{
  "success": boolean,    // 请求是否成功
  "message": string,    // 响应信息
  "data": object|null   // 响应数据
}
```

## 速率限制

为了保护API服务器免受过度使用，系统实施了速率限制机制：

- 每个IP地址在指定时间窗口内允许的最大请求次数是有限制的
- 当达到限制时，API将返回429状态码（Too Many Requests）
- 建议客户端实现适当的重试机制，并在收到429响应时采取退避策略

## 链路追踪

系统实现了完整的请求链路追踪功能：

- 每个请求都会生成唯一的`traceId`和`spanId`
- `traceId`会在响应头中返回（X-Trace-ID字段）
- 可用于跟踪请求在系统中的完整处理过程
- 支持分布式追踪，便于问题定位和性能分析

## 性能监控

系统集成了实时性能监控功能：

- 请求响应时间监控
- 内存使用情况跟踪
- 数据库查询性能统计
- 自动性能告警（响应时间超过1秒时）

监控指标包括：
- 总请求数
- 平均响应时间
- 最大响应时间
- 错误率
- 时间窗口统计（1小时内，按分钟统计）

## 缓存策略

系统采用多级缓存策略提升性能：

### 缓存层级
1. 本地内存缓存（5分钟TTL）
2. Redis分布式缓存（可配置TTL，默认1小时）
3. 布隆过滤器（防止缓存穿透）

### 缓存特性
- 支持缓存预热
- 模式化缓存清理
- 缓存状态监控
- 自动过期策略

## 用户模块

### 用户注册

**接口地址**：`POST /api/users/register`

**请求参数**：
```json
{
  "username": string,   // 用户名，必填，3-30个字符
  "email": string,     // 邮箱，必填，有效的邮箱格式
  "password": string,  // 密码，必填，6-100个字符
  "phone": string,     // 手机号，选填，11位有效手机号
  "role": string,      // 角色，选填，默认为"user"
  "status": string     // 状态，选填，默认为"active"
}
```

**成功响应**：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "id": number,
    "username": string,
    "email": string,
    "phone": string,
    "role": string,
    "status": string
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "message": "错误信息",
  "data": null
}
```

### 用户登录

**接口地址**：`POST /api/users/login`

**请求参数**：
```json
{
  "username": string,  // 用户名，必填
  "password": string   // 密码，必填
}
```

**成功响应**：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": string,    // JWT令牌
    "user": {
      "id": number,
      "username": string,
      "email": string,
      "phone": string,
      "role": string,
      "status": string
    }
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "message": "用户名或密码错误",
  "data": null
}
```

### 用户信息更新

**接口地址**：`PUT /api/users/:id`

**请求参数**：
```json
{
  "email": string,     // 邮箱，选填，必须是有效的邮箱格式
  "phone": string,     // 手机号，选填，必须是有效的手机号
  "password": string,  // 密码，选填，6-100个字符
  "status": string     // 状态，选填，可选值：active/inactive/suspended
}
```

**成功响应**：
```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "id": number,
    "username": string,
    "email": string,
    "phone": string,
    "role": string,
    "status": string,
    "last_login": string
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "message": "更新失败原因",
  "data": null
}
```

### 密码验证

**接口地址**：`POST /api/users/verify-password`

**请求参数**：
```json
{
  "username": string,  // 用户名，必填
  "password": string   // 待验证的密码，必填
}
```

**成功响应**：
```json
{
  "success": true,
  "message": "密码验证成功",
  "data": {
    "isValid": boolean  // 密码是否正确
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "message": "验证失败原因",
  "data": null
}
```

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 注意事项

1. 所有需要认证的接口必须在请求头中携带有效的JWT令牌
2. 令牌的有效期由服务器端配置的`JWT_EXPIRES_IN`环境变量决定
3. 密码在传输前请进行必要的加密处理
4. 请求失败时，请参考错误码和响应消息进行问题排查
5. 注意遵守API的速率限制，避免频繁请求导致被临时限制访问
6. 使用traceId进行问题追踪和定位
7. 关注性能监控指标，及时处理性能告警
8. 合理利用缓存机制提升接口性能
9. 用户密码在服务器端会自动进行加密存储
10. 邮箱和用户名具有唯一性约束，不能重复使用