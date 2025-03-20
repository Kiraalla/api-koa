import dotenvFlow from 'dotenv-flow';
import { Sequelize } from 'sequelize';
import { checkDatabaseStructure } from '../utils/dbInit';

// 加载环境变量
dotenvFlow.config({
  silent: true,
  path: process.cwd(),
  purge_dotenv: true
});

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: process.env.NODE_ENV === 'development',
  pool: {
    max: 20, // 最大连接数
    min: 5,  // 最小连接数
    acquire: 60000, // 连接超时时间
    idle: 30000,   // 空闲超时时间
    evict: 1000    // 清理闲置连接的频率
  },
  dialectOptions: {
    connectTimeout: 60000,
    // 启用压缩
    compress: true
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    freezeTableName: true
  },
  sync: {
    force: false,
    alter: false
  }
});

// 在导出之前检查数据库结构
// 创建一个可以在测试中被捕获的Promise
let dbInitPromise: Promise<void>;

// 执行数据库结构检查
dbInitPromise = (async () => {
  try {
    await checkDatabaseStructure(sequelize);
    return Promise.resolve();
  } catch (error: any) {
    console.error('数据库结构检查失败:', error.message);
    
    // 在生产环境下，记录额外的错误信息
    if (process.env.NODE_ENV === 'production') {
      console.error('生产环境下数据库连接失败，应用将继续运行但功能可能受限');
    }

    // 创建一个错误对象
    const exitError = new Error('Process.exit called with code: 1');
    return Promise.reject(exitError);
  }
})().then(() => {
  // 成功时不做任何处理
}, () => {
  // 失败时退出进程
  process.exit(1);
});




// 导出dbInitPromise以便测试可以捕获到它
export { dbInitPromise };


// 确保Promise错误不会被吞掉
process.on('unhandledRejection', (error) => {
  throw error;
});

export default sequelize;