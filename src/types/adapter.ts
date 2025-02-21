import { ApiResponse, RequestParams } from './common';

/**
 * 客户端类型枚举
 */
export enum ClientType {
  H5 = 'h5',
  MINIPROGRAM = 'miniprogram',
  // 预留其他客户端类型扩展
  APP = 'app',
  PC = 'pc'
}

/**
 * 适配器接口定义
 */
export interface IAdapter {
  /**
   * 转换请求参数
   * @param params 原始请求参数
   */
  transformRequest(params: RequestParams): RequestParams;

  /**
   * 转换响应数据
   * @param response 原始响应数据
   */
  transformResponse<T>(response: ApiResponse<T>): ApiResponse<T>;

  /**
   * 获取客户端类型
   */
  getClientType(): ClientType;
}

/**
 * 适配器工厂接口
 */
export interface IAdapterFactory {
  /**
   * 获取适配器实例
   * @param clientType 客户端类型
   */
  getAdapter(clientType: ClientType): IAdapter;
}

/**
 * 客户端特定的请求头
 */
export interface ClientHeaders {
  platform: ClientType;
  version?: string;
  deviceId?: string;
  timestamp: number;
}