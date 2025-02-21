import { Model } from 'sequelize';

// 用户模型类型
export interface IUser {
  id: number;
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface IUserModel extends Model<IUser>, IUser {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 产品模型类型
export interface IProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface IProductModel extends Model<IProduct>, IProduct {}

// 订单模型类型
export interface IOrder {
  id: number;
  user_id: number;
  order_number: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_method?: string;
  payment_status: string;
  shipping_address: string;
  shipping_method?: string;
  shipping_status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface IOrderModel extends Model<IOrder>, IOrder {}

// 订单商品关联类型
export interface IOrderProduct {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface IOrderProductModel extends Model<IOrderProduct>, IOrderProduct {}