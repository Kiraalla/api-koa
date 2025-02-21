// src/types/common.ts

/**
 * 通用的 HTTP 请求参数类型
 */
export interface RequestParams {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';  // 可选，默认可能是 GET
  data?: Record<string, any>;                  // 请求体数据
  timeout?: number;                            // 超时时间（毫秒）
  headers?: Record<string, string>;            // 自定义请求头
  platform?: string; // 平台信息
  timestamp?: number; // 响应时间戳
}

/**
 * 通用的 API 响应格式
 */
export interface ApiResponse<T = any> {
  code: number;        // 状态码（例如 200 成功，400 参数错误）
  data: T;             // 响应数据（泛型）
  message?: string;    // 可选错误信息
  headers?: Record<string, string>; // 响应头
  success: boolean; // 明确声明 success 属性
  timestamp?: number; // 响应时间戳
}


/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;       // 当前页码（可选，可能有默认值）
  pageSize?: number;   // 每页数量（可选，可能有默认值）
}

// 其他可能的公共类型...