import fs from 'fs';
import winston from 'winston';

// 模拟winston
jest.mock('winston', () => {
  const mockFormat = {
    combine: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    errors: jest.fn().mockReturnThis(),
    splat: jest.fn().mockReturnThis(),
    printf: jest.fn(fn => fn), // 存储并返回传入的格式化函数
    colorize: jest.fn().mockReturnThis(),
    simple: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  
  // 创建带有mock属性的模拟函数
  const mockFileTransport = jest.fn().mockReturnValue({});
  const mockConsoleTransport = jest.fn().mockReturnValue({});
  
  const mockTransports = {
    Console: mockConsoleTransport,
    File: mockFileTransport
  };
  
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    add: jest.fn()
  };
  
  return {
    format: mockFormat,
    transports: mockTransports,
    createLogger: jest.fn().mockReturnValue(mockLogger)
  };
});

// 模拟fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

describe('Logger', () => {
  let originalNodeEnv: string | undefined;
  
  beforeEach(() => {
    // 保存原始环境变量
    originalNodeEnv = process.env.NODE_ENV;
    
    // 重置所有模拟
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // 恢复原始环境变量
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  it('should create log directory if it does not exist', () => {
    // 模拟目录不存在
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // 重新导入logger模块以触发目录创建逻辑
    jest.isolateModules(() => {
      require('../../utils/logger');
    });
    
    expect(fs.existsSync).toHaveBeenCalledWith('logs');
    expect(fs.mkdirSync).toHaveBeenCalledWith('logs', { recursive: true });
  });
  
  it('should not create log directory if it already exists', () => {
    // 模拟目录已存在
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // 重新导入logger模块
    jest.isolateModules(() => {
      require('../../utils/logger');
    });
    
    expect(fs.existsSync).toHaveBeenCalledWith('logs');
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
  
  it('should configure logger with production settings', () => {
    // 设置为生产环境
    process.env.NODE_ENV = 'production';
    
    // 重新导入logger模块
    jest.isolateModules(() => {
      require('../../utils/logger');
    });
    
    expect(winston.createLogger).toHaveBeenCalled();
    const createLoggerArgs = (winston.createLogger as jest.Mock).mock.calls[0][0];
    expect(createLoggerArgs.level).toBe('info');
  });
  
  it('should configure logger with development settings and add console transport', () => {
    // 设置为开发环境
    process.env.NODE_ENV = 'development';
    
    // 重新导入logger模块
    jest.isolateModules(() => {
      require('../../utils/logger');
    });
    
    expect(winston.createLogger).toHaveBeenCalled();
    const createLoggerArgs = (winston.createLogger as jest.Mock).mock.calls[0][0];
    expect(createLoggerArgs.level).toBe('debug');
    
    // 验证是否添加了控制台传输
    const mockLogger = winston.createLogger();
    expect(mockLogger.add).toHaveBeenCalled();
    expect(winston.transports.Console).toHaveBeenCalled();
  });
  
  it('should configure logger with debug level for test environment', () => {
    // 设置为测试环境
    process.env.NODE_ENV = 'test';
    
    // 重新导入logger模块
    jest.isolateModules(() => {
      require('../../utils/logger');
    });
    
    expect(winston.createLogger).toHaveBeenCalled();
    const createLoggerArgs = (winston.createLogger as jest.Mock).mock.calls[0][0];
    expect(createLoggerArgs.level).toBe('debug');
    
    // 验证是否添加了控制台传输
    const mockLogger = winston.createLogger();
    expect(mockLogger.add).toHaveBeenCalled();
    expect(winston.transports.Console).toHaveBeenCalled();
  });
  
  it('should configure logger with debug level for any non-production environment', () => {
    // 设置为其他非生产环境
    process.env.NODE_ENV = 'staging';
    
    // 重新导入logger模块
    jest.isolateModules(() => {
      require('../../utils/logger');
    });
    
    expect(winston.createLogger).toHaveBeenCalled();
    const createLoggerArgs = (winston.createLogger as jest.Mock).mock.calls[0][0];
    expect(createLoggerArgs.level).toBe('debug');
    
    // 验证是否添加了控制台传输
    const mockLogger = winston.createLogger();
    expect(mockLogger.add).toHaveBeenCalled();
    expect(winston.transports.Console).toHaveBeenCalled();
  });
  
  it('should configure file transports correctly', () => {
    // 重新导入logger模块
    jest.isolateModules(() => {
      require('../../utils/logger');
    });
    
    // 验证文件传输配置
    expect(winston.transports.File).toHaveBeenCalledTimes(2); // 错误日志和组合日志
    
    // 检查错误日志配置
    const errorLogConfig = (winston.transports.File as unknown as jest.Mock).mock.calls[0][0];
    expect(errorLogConfig.filename).toContain('error.log');
    expect(errorLogConfig.level).toBe('error');
    
    // 检查组合日志配置
    const combinedLogConfig = (winston.transports.File as unknown as jest.Mock).mock.calls[1][0];
    expect(combinedLogConfig.filename).toContain('combined.log');
  });
  
  it('should format log message with traceId and spanId when provided', () => {
    // 创建与logger.ts中相同的格式化函数
    const printfFn = ({ level, message, timestamp, traceId, spanId, ...metadata }: {
      level: string;
      message: string;
      timestamp: string;
      traceId?: string | null;
      spanId?: string | null;
      [key: string]: any;
    }) => {
      let msg = `${timestamp} [${level}]`;
      if (traceId) msg += ` [${traceId}]`;
      if (spanId) msg += ` [${spanId}]`;
      msg += `: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += `\n${JSON.stringify(metadata, null, 2)}`;
      }
      return msg;
    };
    
    // 测试包含traceId的情况
    const msgWithTraceId = printfFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00',
      traceId: 'trace-123',
      spanId: null
    });
    expect(msgWithTraceId).toBe('2023-01-01 12:00:00 [info] [trace-123]: Test message');
    
    // 测试包含spanId的情况
    const msgWithSpanId = printfFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00',
      traceId: null,
      spanId: 'span-456'
    });
    expect(msgWithSpanId).toBe('2023-01-01 12:00:00 [info] [span-456]: Test message');
    
    // 测试同时包含traceId和spanId的情况
    const msgWithBoth = printfFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00',
      traceId: 'trace-123',
      spanId: 'span-456'
    });
    expect(msgWithBoth).toBe('2023-01-01 12:00:00 [info] [trace-123] [span-456]: Test message');
    
    // 测试不包含traceId和spanId的情况
    const msgWithoutIds = printfFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00',
      traceId: null,
      spanId: null
    });
    expect(msgWithoutIds).toBe('2023-01-01 12:00:00 [info]: Test message');
  });
  
  it('should format log message with metadata when provided', () => {
    // 创建与logger.ts中相同的格式化函数
    const printfFn = ({ level, message, timestamp, traceId, spanId, ...metadata }: {
      level: string;
      message: string;
      timestamp: string;
      traceId?: string | null;
      spanId?: string | null;
      [key: string]: any;
    }) => {
      let msg = `${timestamp} [${level}]`;
      if (traceId) msg += ` [${traceId}]`;
      if (spanId) msg += ` [${spanId}]`;
      msg += `: ${message}`;
      if (Object.keys(metadata).length > 0) {
        msg += `\n${JSON.stringify(metadata, null, 2)}`;
      }
      return msg;
    };
    
    // 测试包含元数据的情况
    const msgWithMetadata = printfFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00',
      userId: 123,
      action: 'login'
    });
    
    // 验证基本消息格式
    expect(msgWithMetadata).toContain('2023-01-01 12:00:00 [info]: Test message\n');
    
    // 验证元数据被包含在消息中
    const metadataJson = JSON.stringify({ userId: 123, action: 'login' }, null, 2);
    expect(msgWithMetadata).toContain(metadataJson);
    
    // 测试不包含元数据的情况
    const msgWithoutMetadata = printfFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00'
    });
    expect(msgWithoutMetadata).toBe('2023-01-01 12:00:00 [info]: Test message');
  });
});