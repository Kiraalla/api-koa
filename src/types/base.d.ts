import winston from 'winston';

// 基础响应状态码枚举
export enum ResponseStatus {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500
}

// 基础请求响应类型
export interface BaseRequest {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
  headers: Record<string, string>;
  user?: UserContext;
  platform?: string;
  timestamp: number;
}

export interface BaseResponse<T = unknown> {
  success: boolean;
  code: ResponseStatus;
  message: string;
  data: T | null;
  error?: BaseError;
  timestamp: number;
}

// 用户上下文类型
export interface UserContext {
  id: number;
  role: string;
  permissions: string[];
  metadata?: Record<string, unknown>;
}

// 基础错误类型
export interface BaseError {
  code: string;
  message: string;
  status: ResponseStatus;
  details?: Record<string, unknown>;
}

// 分页相关类型
export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 日志相关类型
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogMetadata {
  [key: string]: unknown;
}

export interface LoggerConfig {
  level: LogLevel;
  filename?: string;
  maxSize?: number;
  maxFiles?: number;
}

export interface ILogger {
  error(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  debug(message: string, ...meta: any[]): void;
  add(transport: winston.transport): winston.Logger;
}

// 扩展的Koa上下文类型
// 使用从index.ts导入的CustomContext接口
import { CustomContext } from './index';

// 重新导出CustomContext
export { CustomContext };
