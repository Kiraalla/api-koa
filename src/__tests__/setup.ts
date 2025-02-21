import '@jest/globals';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 配置测试数据库连接
export const testDb = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: false
});

// 在所有测试开始前执行
beforeAll(async () => {
  try {
    // 测试数据库连接
    await testDb.authenticate();
    console.log('Connection has been established successfully.');
    // 同步数据库结构
    await testDb.sync({ force: true });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});

// 在每个测试用例后执行
afterEach(async () => {
  // 清理所有表数据
  const tables = Object.keys(testDb.models);
  for (const table of tables) {
    await testDb.models[table].destroy({ truncate: true, force: true });
  }
});

// 在所有测试结束后执行
afterAll(async () => {
  // 关闭数据库连接
  await testDb.close();
});
