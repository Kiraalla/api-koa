import winston from 'winston';

// 定义日志级别类型
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 定义日志元数据接口
export interface LogMetadata {
  [key: string]: any;
}

// 定义日志配置接口
export interface LoggerConfig {
  level: LogLevel;
  filename?: string;
  maxSize?: number;
  maxFiles?: number;
}

// 定义日志记录器接口
export interface ILogger {
  error(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  debug(message: string, ...meta: any[]): void;
  add(transport: winston.transport): winston.Logger;
}