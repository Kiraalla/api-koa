import { Model } from 'sequelize';
import { BaseModel, BaseModelStatic } from '../core';

// 用户相关类型定义
export interface IUser extends BaseModel {
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  last_login?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export interface IUserModel extends Model<IUser>, IUser {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModelStatic = BaseModelStatic<IUserModel>;

// 产品相关类型定义
export interface IProduct extends BaseModel {
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  status: ProductStatus;
  metadata?: Record<string, unknown>;
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock'
}

export interface IProductModel extends Model<IProduct>, IProduct {}

export type ProductModelStatic = BaseModelStatic<IProductModel>;

// 订单相关类型定义
export interface IOrder extends BaseModel {
  user_id: number;
  order_number: string;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  shipping_address: string;
  shipping_method: ShippingMethod;
  shipping_status: ShippingStatus;
  metadata?: Record<string, unknown>;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum ShippingMethod {
  STANDARD = 'standard',
  EXPRESS = 'express',
  NEXT_DAY = 'next_day'
}

export enum ShippingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered'
}

export interface IOrderModel extends Model<IOrder>, IOrder {}

export type OrderModelStatic = BaseModelStatic<IOrderModel>;

// 订单商品关联类型定义
export interface IOrderProduct extends BaseModel {
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  metadata?: Record<string, unknown>;
}

export interface IOrderProductModel extends Model<IOrderProduct>, IOrderProduct {}

export type OrderProductModelStatic = BaseModelStatic<IOrderProductModel>;