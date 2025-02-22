import type { Config } from 'jest';

const config: Config = {
  testTimeout: 30000, // 设置全局测试超时时间为30秒
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1' // 如果使用路径别名需要配置
  }
};

export default config;