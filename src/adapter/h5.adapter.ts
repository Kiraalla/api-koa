import { IAdapter, ClientType } from './types';

/**
 * H5端适配器实现
 */
export class H5Adapter implements IAdapter {
  /**
   * 转换请求参数
   * @param params 原始请求参数
   */
  transformRequest(params: any): any {
    // H5端请求参数处理逻辑
    return params;
  }

  /**
   * 转换响应数据
   * @param response 原始响应数据
   */
  transformResponse(response: any): any {
    // H5端响应数据处理逻辑
    return {
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