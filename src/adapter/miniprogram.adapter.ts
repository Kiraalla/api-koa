import { IAdapter, ClientType } from './types';

/**
 * 小程序端适配器实现
 */
export class MiniprogramAdapter implements IAdapter {
  /**
   * 转换请求参数
   * @param params 原始请求参数
   */
  transformRequest(params: any): any {
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
  transformResponse(response: any): any {
    // 小程序端的响应数据处理逻辑
    // 可能需要调整数据结构以适应小程序的需求
    return {
      code: response.success ? 0 : 1,
      msg: response.message,
      result: response.data
    };
  }

  /**
   * 获取客户端类型
   */
  getClientType(): ClientType {
    return ClientType.MINIPROGRAM;
  }
}