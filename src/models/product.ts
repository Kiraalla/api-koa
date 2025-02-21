import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

class Product extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public price!: number;
  public stock!: number;
  public image?: string;
  public category!: string;
  public status!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    stock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'products',
    indexes: [
      {
        name: 'idx_product_category',
        fields: ['category'], // 商品分类索引，优化分类查询
      },
      {
        name: 'idx_product_status',
        fields: ['status'], // 商品状态索引，优化状态筛选
      },
      {
        name: 'idx_product_price',
        fields: ['price'], // 价格索引，优化价格范围查询
      },
      {
        name: 'idx_product_stock',
        fields: ['stock'], // 库存索引，优化库存筛选
      }
    ]
  }
);

export default Product;