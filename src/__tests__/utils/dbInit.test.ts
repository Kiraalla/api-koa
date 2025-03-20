import { Sequelize } from 'sequelize';
import { checkDatabaseStructure } from '../../utils/dbInit';
import { logger } from '../../utils/logger';

// 模拟logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// 模拟inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ shouldInit: true, shouldUpdate: true })
}));

describe('Database Initialization', () => {
  let mockSequelize: jest.Mocked<Sequelize>;
  let originalNodeEnv: string | undefined;
  
  beforeEach(() => {
    // 保存原始环境变量
    originalNodeEnv = process.env.NODE_ENV;
    
    // 创建模拟的Sequelize实例
    mockSequelize = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      getQueryInterface: jest.fn().mockReturnValue({
        showAllTables: jest.fn().mockResolvedValue(['users']),
        describeTable: jest.fn().mockResolvedValue({
          id: {},
          username: {},
          email: {},
          password: {},
          phone: {},
          avatar: {},
          role: {},
          status: {},
          last_login: {},
          created_at: {},
          updated_at: {},
          deleted_at: {}
        })
      }),
      sync: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<Sequelize>;
    
    // 清除所有模拟函数的调用记录
    jest.clearAllMocks();
    
    // 模拟console.log以避免测试输出
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // 恢复原始环境变量
    process.env.NODE_ENV = originalNodeEnv;
    
    // 恢复console.log
    jest.restoreAllMocks();
  });
  
  it('should successfully check database structure when all tables exist', async () => {
    await checkDatabaseStructure(mockSequelize);
    
    expect(mockSequelize.authenticate).toHaveBeenCalled();
    expect(mockSequelize.getQueryInterface().showAllTables).toHaveBeenCalled();
    expect(mockSequelize.getQueryInterface().describeTable).toHaveBeenCalledWith('users');
    expect(mockSequelize.sync).not.toHaveBeenCalled(); // 不应该调用sync因为表已存在且结构正确
  });
  
  it('should initialize database when tables are missing in development environment', async () => {
    // 模拟缺少表
    mockSequelize.getQueryInterface().showAllTables = jest.fn().mockResolvedValue([]);
    
    // 设置为开发环境
    process.env.NODE_ENV = 'development';
    
    await checkDatabaseStructure(mockSequelize);
    
    expect(mockSequelize.authenticate).toHaveBeenCalled();
    expect(mockSequelize.getQueryInterface().showAllTables).toHaveBeenCalled();
    expect(mockSequelize.sync).toHaveBeenCalledWith({ force: true });
  });
  
  it('should automatically initialize database in production environment', async () => {
    // 模拟缺少表
    mockSequelize.getQueryInterface().showAllTables = jest.fn().mockResolvedValue([]);
    
    // 设置为生产环境
    process.env.NODE_ENV = 'production';
    
    await checkDatabaseStructure(mockSequelize);
    
    expect(mockSequelize.authenticate).toHaveBeenCalled();
    expect(mockSequelize.getQueryInterface().showAllTables).toHaveBeenCalled();
    expect(mockSequelize.sync).toHaveBeenCalledWith({ force: true });
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });
  
  it('should update table structure when columns are missing', async () => {
    // 模拟缺少列
    mockSequelize.getQueryInterface().describeTable = jest.fn().mockResolvedValue({
      id: {},
      username: {},
      email: {},
      // 缺少password和其他列
    });
    
    await checkDatabaseStructure(mockSequelize);
    
    expect(mockSequelize.authenticate).toHaveBeenCalled();
    expect(mockSequelize.getQueryInterface().describeTable).toHaveBeenCalledWith('users');
    expect(mockSequelize.sync).toHaveBeenCalledWith({ alter: true });
  });
  
  it('should throw error when user declines to initialize database', async () => {
    // 模拟缺少表
    mockSequelize.getQueryInterface().showAllTables = jest.fn().mockResolvedValue([]);
    
    // 模拟用户拒绝初始化
    require('inquirer').prompt = jest.fn().mockResolvedValue({ shouldInit: false });
    
    await expect(checkDatabaseStructure(mockSequelize)).rejects.toThrow('数据库结构不完整');
  });
  
  it('should throw error when user declines to update table structure', async () => {
    // 模拟缺少列
    mockSequelize.getQueryInterface().describeTable = jest.fn().mockResolvedValue({
      id: {},
      // 缺少其他列
    });
    
    // 模拟用户拒绝更新
    require('inquirer').prompt = jest.fn().mockResolvedValue({ shouldUpdate: false });
    
    await expect(checkDatabaseStructure(mockSequelize)).rejects.toThrow('表结构不完整');
  });
  
  it('should handle database connection error', async () => {
    // 模拟连接错误
    const connectionError = new Error('Connection refused') as any;
    connectionError.name = 'SequelizeConnectionRefusedError';
    mockSequelize.authenticate = jest.fn().mockRejectedValue(connectionError);
    
    await expect(checkDatabaseStructure(mockSequelize)).rejects.toThrow('无法连接到数据库');
  });
  
  it('should rethrow other errors', async () => {
    // 模拟其他错误
    const otherError = new Error('Some other error');
    mockSequelize.authenticate = jest.fn().mockRejectedValue(otherError);
    
    await expect(checkDatabaseStructure(mockSequelize)).rejects.toThrow('Some other error');
  });
});