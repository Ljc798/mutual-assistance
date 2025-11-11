import http from '@ohos.net.http';
import { buildUrl } from './env';

export interface QueryParamItem {
  key: string;
  value: string;
}

interface HttpOptions {
  method: http.RequestMethod;
  connectTimeout: number;
  readTimeout: number;
  expectDataType: http.HttpDataType;
}

function serializeQuery(params?: QueryParamItem[]): string {
  if (!params || params.length === 0) {
    return '';
  }
  const segments: string[] = [];
  for (let i = 0; i < params.length; i++) {
    const item = params[i];
    if (!item || !item.key) {
      continue;
    }
    segments.push(`${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`);
  }
  return segments.join('&');
}

async function request<T>(path: string, params?: QueryParamItem[]): Promise<T | null> {
  const query = serializeQuery(params);
  const url = query.length > 0 ? `${buildUrl(path)}?${query}` : buildUrl(path);
  const client = http.createHttp();
  const requestOptions: HttpOptions = {
    method: http.RequestMethod.GET,
    connectTimeout: 15000,
    readTimeout: 15000,
    expectDataType: http.HttpDataType.STRING
  };

  try {
    const response = await client.request(url, requestOptions);
    if (response.responseCode >= 200 && response.responseCode < 300) {
      const textResult = typeof response.result === 'string' ? response.result : '';
      if (!textResult) {
        return null;
      }
      try {
        return JSON.parse(textResult) as T;
      } catch (parseError) {
        const errorMessage = parseError && typeof parseError === 'object' ? JSON.stringify(parseError) : 'unknown';
        throw new Error(`JSON parse error: ${errorMessage}`);
      }
    }
    throw new Error(`Request failed with status ${response.responseCode}`);
  } finally {
    client.destroy();
  }
}

export async function getJson<T>(path: string, params?: QueryParamItem[]): Promise<T | null> {
  return request<T>(path, params);
}
