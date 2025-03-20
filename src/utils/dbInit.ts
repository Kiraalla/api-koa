import inquirer from 'inquirer';
import { Sequelize } from 'sequelize';
import { logger } from './logger';

/**
 * 检查数据库连接并验证表结构
 * @param sequelize Sequelize实例
 */
export async function checkDatabaseStructure(sequelize: Sequelize): Promise<void> {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 检查表是否存在
    const tables = await sequelize.getQueryInterface().showAllTables();
    const requiredTables = ['users']; // 添加其他必需的表
    const missingTables = requiredTables.filter(table => !tables.includes(table));

    if (missingTables.length > 0) {
      console.log('缺少必要的数据库表:', missingTables);
      
      // 非生产环境下询问是否初始化
      if (process.env.NODE_ENV !== 'production') {
        const { shouldInit } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInit',
            message: '是否要初始化数据库结构？',
            default: true
          }
        ]);

        if (shouldInit) {
          await initializeDatabase(sequelize);
          console.log('数据库结构初始化完成');
        } else {
          throw new Error('数据库结构不完整，应用无法正常运行');
        }
      } else {
        // 生产环境下自动初始化
        logger.warn('生产环境检测到缺少必要的数据库表，正在自动初始化');
        await initializeDatabase(sequelize);
        logger.info('数据库结构初始化完成');
      }
    } else {
      // 检查表结构
      await validateTableStructure(sequelize);
      console.log('数据库结构验证通过');
    }
  } catch (error: any) {
    if (error.name === 'SequelizeConnectionError' || 
        error.name === 'SequelizeConnectionRefusedError') {
      throw new Error('无法连接到数据库，请检查数据库配置和服务状态');
    }
    throw error;
  }
}

/**
 * 初始化数据库
 * @param sequelize Sequelize实例
 */
async function initializeDatabase(sequelize: Sequelize): Promise<void> {
  await sequelize.sync({ force: true }); // 强制创建表，注意：这会删除现有的表
}

/**
 * 验证表结构
 * @param sequelize Sequelize实例
 */
async function validateTableStructure(sequelize: Sequelize): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  
  // 检查users表结构
  const userColumns = await queryInterface.describeTable('users');
  const requiredColumns = [
    'id',
    'username',
    'email',
    'password',
    'phone',
    'avatar',
    'role',
    'status',
    'last_login',
    'created_at',
    'updated_at',
    'deleted_at'
  ];

  const missingColumns = requiredColumns.filter(column => !userColumns[column]);
  
  if (missingColumns.length > 0) {
    const { shouldUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldUpdate',
        message: `users表缺少以下字段: ${missingColumns.join(', ')}。是否要更新表结构？`,
        default: true
      }
    ]);

    if (shouldUpdate) {
      await sequelize.sync({ alter: true }); // 更新表结构
      console.log('表结构更新完成');
    } else {
      throw new Error('表结构不完整，应用无法正常运行');
    }
  }
}