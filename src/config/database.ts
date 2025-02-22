import { Sequelize } from 'sequelize';
import dotenvFlow from 'dotenv-flow';

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

export default sequelize;