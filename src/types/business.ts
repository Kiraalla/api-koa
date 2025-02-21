import { PaginationParams } from './common';

/**
 * 产品相关类型定义
 */
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  status: ProductStatus;
  created_at: Date;
  updated_at: Date;
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  status?: ProductStatus;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

export interface ProductQuery extends PaginationParams {
  category?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * 订单相关类型定义
 */
export interface Order {
  id: number;
  user_id: number;
  products: OrderProduct[];
  total_amount: number;
  status: OrderStatus;
  shipping_address: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderProduct {
  product_id: number;
  quantity: number;
  price: number;
  product_name: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export interface CreateOrderDTO {
  products: Array<{
    product_id: number;
    quantity: number;
  }>;
  shipping_address: string;
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
  shipping_address?: string;
}

export interface OrderQuery extends PaginationParams {
  user_id?: number;
  status?: OrderStatus;
  start_date?: Date;
  end_date?: Date;
}