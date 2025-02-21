import { Context } from 'koa';

// 通用请求接口
export interface BaseRequest {
  body: any;
  query: any;
  params: any;
}

// 通用响应接口
export interface BaseResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

// 产品相关请求接口
export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  status?: 'active' | 'inactive';
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

// 产品相关响应接口
export interface ProductResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image?: string;
  category: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

// 订单相关请求接口
export interface CreateOrderRequest {
  products: Array<{
    product_id: number;
    quantity: number;
  }>;
  shipping_address: string;
  shipping_method?: string;
  payment_method?: string;
}

export interface UpdateOrderRequest {
  status?: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  shipping_status?: 'unshipped' | 'shipped' | 'delivered';
}

// 订单相关响应接口
export interface OrderResponse {
  id: number;
  order_number: string;
  user_id: number;
  total_amount: number;
  status: string;
  payment_method?: string;
  payment_status: string;
  shipping_address: string;
  shipping_method?: string;
  shipping_status: string;
  created_at: Date;
  updated_at: Date;
  items: OrderItemResponse[];
}

export interface OrderItemResponse {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product: ProductResponse;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// 用户相关接口
export interface UserAttributes {
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

// 用户注册请求体
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

// 用户登录请求体
export interface LoginRequest {
  email: string;
  password: string;
}

// 用户登录响应数据
export interface LoginResponse {
  token: string;
  user: Omit<UserAttributes, 'password'>;
}

// 扩展Koa Context类型
export interface CustomContext extends Context {
  state: {
    user?: {
      id: number;
      username: string;
      role: string;
    };
  };
}

// 类型守卫函数
export function isUserAttributes(obj: any): obj is UserAttributes {
  return (
    obj &&
    typeof obj.id === 'number' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.role === 'string'
  );
}
