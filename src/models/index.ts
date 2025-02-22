import { Sequelize } from 'sequelize';
import User from './user';
import { Order, OrderItem } from './order';
import Product from './product';
import sequelize from '../config/database';

// 初始化所有模型
const models = {
  User,
  Order,
  OrderItem,
  Product
};

// 设置模型之间的关联关系
User.hasMany(Order, {
  foreignKey: 'user_id',
  as: 'userOrders'
});

Order.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'orderUser'
});

// 订单与订单项的关联关系已在order.ts中定义
// 这里不再需要创建额外的订单商品关联表，因为通过OrderItem已经建立了关联

// 导出所有模型和数据库实例
export { sequelize };
export default models;