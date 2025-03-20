// src/types/common.ts

/**
 * 通用的 HTTP 请求参数类型
 */
export interface RequestParams {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';  // 明确指定HTTP方法
  data?: Record<string, unknown>;             // 请求体数据，使用unknown代替any
  timeout: number;                            // 超时时间（毫秒）
  headers: Record<string, string>;            // 自定义请求头
  platform: string;                           // 平台信息
  timestamp: number;                          // 请求时间戳
  version?: string;                           // API版本号
  deviceId?: string;                          // 设备标识
}

/**
 * 通用的 API 响应格式
 */
export interface ApiResponse<T = unknown> {
  code: number;                               // 状态码（例如 200 成功，400 参数错误）
  data: T;                                    // 响应数据（泛型）
  message: string;                            // 响应消息
  headers: Record<string, string>;            // 响应头
  success: boolean;                           // 响应状态
  timestamp: number;                          // 响应时间戳
  traceId?: string;                          // 请求追踪ID
  requestId?: string;                         // 请求唯一标识
  serverTime?: number;                        // 服务器时间
}


/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;       // 当前页码（可选，可能有默认值）
  pageSize?: number;   // 每页数量（可选，可能有默认值）
}

// 其他可能的公共类型...