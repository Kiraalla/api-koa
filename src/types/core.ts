import { Context } from 'koa';
import { Model, ModelStatic, RestoreOptions, Attributes } from 'sequelize';

// 核心业务模型接口
export interface ICrudOperations<T extends Model> {
  create(data: Partial<T>): Promise<T>;
  findById(id: number): Promise<T | null>;
  findAll(options?: Record<string, unknown>): Promise<T[]>;
  update(id: number, data: Partial<T>): Promise<[number, T[]]>;
  delete(id: number): Promise<number>;
}

// 服务层基础接口
export interface IBaseService<T extends Model> extends ICrudOperations<T> {
  model: ModelStatic<T>;
  validate?(data: Partial<T>): Promise<void>;
  beforeCreate?(data: Partial<T>): Promise<void>;
  afterCreate?(instance: T): Promise<void>;
  beforeUpdate?(data: Partial<T>): Promise<void>;
  afterUpdate?(instance: T): Promise<void>;
  beforeDelete?(id: number): Promise<void>;
  afterDelete?(id: number): Promise<void>;
}

// 控制器层基础接口
export interface IBaseController<T extends Model> {
  service: IBaseService<T>;
  create(ctx: Context): Promise<void>;
  findById(ctx: Context): Promise<void>;
  findAll(ctx: Context): Promise<void>;
  update(ctx: Context): Promise<void>;
  delete(ctx: Context): Promise<void>;
}

// 中间件上下文扩展
export interface MiddlewareContext extends Context {
  user?: UserContext;
  requestId?: string;
  startTime?: number;
}

// 基础响应状态码枚举
export enum ResponseStatus {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500
}

// 基础错误类型
export interface BaseError {
  code: string;
  message: string;
  status: ResponseStatus;
  details?: Record<string, unknown>;
}

// 基础响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: ResponseStatus;
  message: string;
  data: T | null;
  error?: BaseError;
  timestamp: number;
}

// 基础请求类型
export interface BaseRequest {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
  headers: Record<string, string>;
  user?: UserContext;
  platform?: string;
  timestamp: number;
}

// 用户上下文类型
export interface UserContext {
  id: number;
  role: string;
  permissions: string[];
  metadata?: Record<string, unknown>;
}

// 扩展的Koa上下文类型
export interface CustomContext extends Context {
  request: Context['request'] & BaseRequest;
  user?: UserContext;
  requestId: string;
  startTime: number;
  validatedData?: Record<string, unknown>;
}

// 分页参数接口
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// 基础模型接口
export interface BaseModel {
  id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// 基础模型静态类型
export interface BaseModelStatic<T extends Model> extends ModelStatic<T> {
  paginate(params: PaginationParams): Promise<PaginatedResponse<T>>;
  softDelete(id: number): Promise<void>;
  restore<M extends Model>(this: ModelStatic<M>, options?: RestoreOptions<Attributes<M>>): Promise<void>;
}

// 服务层结果类型
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: BaseError;
  meta?: Record<string, unknown>;
}

// 验证规则类型
export interface ValidationRule {
  type: string;
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | Promise<boolean>;
}

// 验证规则集合
export interface ValidationSchema {
  [field: string]: ValidationRule;
}

// 缓存配置接口
export interface CacheConfig {
  ttl: number;
  prefix?: string;
  serialize?: (data: unknown) => string;
  deserialize?: (data: string) => unknown;
}