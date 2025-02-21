import { PaginationParams } from '../base';

// 用户状态和角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// 产品和订单状态枚举
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 支付和配送方式枚举
export enum PaymentMethod {
  ONLINE = 'online',
  OFFLINE = 'offline'
}

export enum ShippingMethod {
  EXPRESS = 'express',
  STANDARD = 'standard'
}

// 用户相关DTO
export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserDTO extends Partial<Omit<CreateUserDTO, 'password'>> {
  password?: string;
  current_password?: string;
}

export interface UserQuery extends PaginationParams {
  role?: UserRole;
  status?: UserStatus;
  email?: string;
  username?: string;
}

// 产品相关DTO
export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  status?: ProductStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

export interface ProductQuery extends PaginationParams {
  category?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
}

// 订单相关DTO
export interface CreateOrderDTO {
  products: Array<{
    product_id: number;
    quantity: number;
  }>;
  shipping_address: string;
  shipping_method: ShippingMethod;
  payment_method: PaymentMethod;
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
  shipping_status?: string;
  payment_status?: string;
}

export interface OrderQuery extends PaginationParams {
  status?: OrderStatus;
  payment_method?: PaymentMethod;
  shipping_method?: ShippingMethod;
  start_date?: string;
  end_date?: string;
}

// 通用查询参数
export interface BaseQuery extends PaginationParams {
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  start_date?: string;
  end_date?: string;
}