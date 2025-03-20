import { checkDatabaseStructure } from '../../utils/dbInit';

// 模拟process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`Process.exit called with code: ${code}`);
});

// 模拟console.error
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// 模拟checkDatabaseStructure
jest.mock('../../utils/dbInit', () => ({
  checkDatabaseStructure: jest.fn().mockImplementation(() => {
    throw new Error('Database check failed');
  })
}));

// 模拟sequelize
jest.mock('sequelize', () => {
  return {
    Sequelize: jest.fn().mockImplementation(() => ({
      authenticate: jest.fn(),
      sync: jest.fn(),
      getQueryInterface: jest.fn()
    }))
  };
});

// 模拟dotenv-flow
jest.mock('dotenv-flow', () => ({
  config: jest.fn()
}));

describe('Database Configuration', () => {
  let originalNodeEnv: string | undefined;
  
  beforeEach(() => {
    // 保存原始环境变量
    originalNodeEnv = process.env.NODE_ENV;
    
    // 重置所有模拟
    jest.clearAllMocks();
    jest.resetModules();
    
    // 重新设置process.exit的模拟
    mockExit.mockImplementation((code) => {
      throw new Error(`Process.exit called with code: ${code}`);
    });
  });
  
  afterEach(() => {
    // 恢复原始环境变量
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  it('should exit with code 1 when database structure check fails in non-production environment', async () => {
    // 设置为开发环境
    process.env.NODE_ENV = 'development';
    
    // 模拟数据库结构检查失败
    (checkDatabaseStructure as jest.Mock).mockRejectedValueOnce(new Error('Database check failed'));
    
    // 导入数据库配置模块并等待初始化完成
    const { dbInitPromise } = await import('../../config/database');
    await expect(dbInitPromise).rejects.toThrow('Process.exit called with code: 1');
    
    expect(mockConsoleError).toHaveBeenCalledWith('数据库结构检查失败:', 'Database check failed');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
  
  it('should log error but still exit with code 1 when database structure check fails in production environment', async () => {
    // 设置为生产环境
    process.env.NODE_ENV = 'production';
    
    // 模拟数据库结构检查失败
    (checkDatabaseStructure as jest.Mock).mockRejectedValueOnce(new Error('Database check failed'));
    
    // 导入数据库配置模块并等待初始化完成
    const { dbInitPromise } = await import('../../config/database');
    await expect(dbInitPromise).rejects.toThrow('Process.exit called with code: 1');
    
    expect(mockConsoleError).toHaveBeenCalledWith('数据库结构检查失败:', 'Database check failed');
    expect(mockConsoleError).toHaveBeenCalledWith('生产环境下数据库连接失败，应用将继续运行但功能可能受限');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});