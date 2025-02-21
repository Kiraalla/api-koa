import { ClientType, IAdapter } from '../types/adapter';
import { ApiResponse, RequestParams } from '../types/common';

/**
 * H5端适配器实现
 */
export class H5Adapter implements IAdapter {
  /**
   * 转换请求参数
   * @param params 原始请求参数
   */
  transformRequest(params: RequestParams): RequestParams {
    // H5端请求参数处理逻辑
    return params;
  }

  /**
   * 转换响应数据
   * @param response 原始响应数据
   */
  transformResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    // H5端响应数据处理逻辑
    return {
      code: response.code, // 从 HTTP 状态码中获取
      success: response.success,
      message: response.message,
      data: response.data
    };
  }

  /**
   * 获取客户端类型
   */
  getClientType(): ClientType {
    return ClientType.H5;
  }
}