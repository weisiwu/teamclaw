/**
 * Jest 全局测试设置
 * 在所有测试运行前执行
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 全局超时设置
jest.setTimeout(10000);
