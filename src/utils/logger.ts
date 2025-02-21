import winston from 'winston';
import path from 'path';
import { ILogger } from './logger.d';

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, traceId, spanId, ...metadata }) => {
    let msg = `${timestamp} [${level}]`;
    if (traceId) msg += ` [${traceId}]`;
    if (spanId) msg += ` [${spanId}]`;
    msg += `: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
  })
);

// 日志配置
const LOG_DIR = 'logs';
const LOG_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const LOG_MAX_FILES = 5;

// 确保日志目录存在
if (!require('fs').existsSync(LOG_DIR)) {
  require('fs').mkdirSync(LOG_DIR, { recursive: true });
}

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
}) as ILogger;

// 在非生产环境下，将日志打印到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export { logger };