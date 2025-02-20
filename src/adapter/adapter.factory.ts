import { IAdapter, ClientType } from './types';
import { H5Adapter } from './h5.adapter';
import { MiniprogramAdapter } from './miniprogram.adapter';

/**
 * 适配器工厂类
 */
export class AdapterFactory {
  private static instance: AdapterFactory;
  private adapters: Map<ClientType, IAdapter>;

  private constructor() {
    this.adapters = new Map();
    this.adapters.set(ClientType.H5, new H5Adapter());
    this.adapters.set(ClientType.MINIPROGRAM, new MiniprogramAdapter());
  }

  /**
   * 获取工厂实例
   */
  public static getInstance(): AdapterFactory {
    if (!AdapterFactory.instance) {
      AdapterFactory.instance = new AdapterFactory();
    }
    return AdapterFactory.instance;
  }

  /**
   * 根据客户端类型获取对应的适配器
   * @param clientType 客户端类型
   */
  public getAdapter(clientType: ClientType): IAdapter {
    const adapter = this.adapters.get(clientType);
    if (!adapter) {
      throw new Error(`不支持的客户端类型: ${clientType}`);
    }
    return adapter;
  }
}