/** 手动切环境：'dev' | 'prod' —— 改这一行即可 */
export type AppEnv = 'dev' | 'prod';
export const APP_ENV: AppEnv = 'prod';  // ← 手动切换

/** 各环境后端地址 */
const HOST = {
  dev:  'http://localhost:8888/api',
  prod: 'https://mutualcampus.top/api',
} as const;

/** 导出给全局使用 */
export const BASE_URL = HOST[APP_ENV];
