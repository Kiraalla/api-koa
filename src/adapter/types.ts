/**
 * 定义请求来源类型
 */
export enum ClientType {
  H5 = 'h5',
  MINIPROGRAM = 'miniprogram'
}

/**
 * 适配器接口定义
 */
export interface IAdapter {
  /**
   * 转换请求参数
   * @param params 原始请求参数
   */
  transformRequest(params: any): any;

  /**
   * 转换响应数据
   * @param response 原始响应数据
   */
  transformResponse(response: any): any;

  /**
   * 获取客户端类型
   */
  getClientType(): ClientType;
}