# Shop API 接口文档

## 目录
- [认证说明](#认证说明)
- [接口响应格式](#接口响应格式)
- [速率限制](#速率限制)
- [用户模块](#用户模块)
  - [用户注册](#用户注册)
  - [用户登录](#用户登录)

## 认证说明

### JWT认证
本API使用JWT（JSON Web Token）进行身份验证。在调用需要认证的接口时，需要在请求头中添加`Authorization`字段，格式为：

```
Authorization: Bearer <token>
```

### 权限级别
系统包含两种用户角色：
- `user`: 普通用户
- `admin`: 管理员

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

## 用户模块

### 用户注册

**接口地址**：`POST /api/users/register`

**请求参数**：
```json
{
  "username": string,   // 用户名，必填
  "email": string,     // 邮箱，必填
  "password": string,  // 密码，必填
  "phone": string      // 手机号，选填
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
    "role": string
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
      "role": string
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