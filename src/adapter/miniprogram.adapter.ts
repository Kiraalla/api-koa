import { ClientType, IAdapter } from '../types/adapter';
import { ApiResponse, RequestParams } from '../types/common';

/**
 * 小程序端适配器实现
 */
export class MiniprogramAdapter implements IAdapter {
  /**
   * 转换请求参数
   * @param params 原始请求参数
   */
  transformRequest(params: RequestParams): RequestParams {
    // 小程序端可能需要添加特定的参数
    return {
      ...params,
      platform: 'miniprogram',
      timestamp: Date.now()
    };
  }

  /**
   * 转换响应数据
   * @param response 原始响应数据
   */
  transformResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    // 小程序端的响应数据处理逻辑
    // 可能需要调整数据结构以适应小程序的需求
    return {
      code: response.code, // 从 HTTP 状态码中获取
      success: response.success,
      message: response.message,
      data: response.data,
      timestamp: Date.now()
    };
  }

  /**
   * 获取客户端类型
   */
  getClientType(): ClientType {
    return ClientType.MINIPROGRAM;
  }
}