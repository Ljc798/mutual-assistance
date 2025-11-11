export type AppEnv = 'dev' | 'prod';

export const APP_ENV: AppEnv = 'prod';

function resolveBaseUrl(env: AppEnv): string {
  if (env === 'dev') {
    return 'http://localhost:8888/api';
  }
  return 'https://mutualcampus.top/api';
}

export const BASE_URL: string = resolveBaseUrl(APP_ENV);

export function buildUrl(path: string): string {
  if (!path || path.length === 0) {
    return BASE_URL;
  }
  if (path.indexOf('http') === 0) {
    return path;
  }
  if (path.charAt(0) === '/') {
    return `${BASE_URL}${path}`;
  }
  return `${BASE_URL}/${path}`;
}
