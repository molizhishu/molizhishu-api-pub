import { config } from './config.js';

let runtimeToken = config.token;

export function getApiToken() {
  return runtimeToken;
}

export function updateApiToken(token) {
  runtimeToken = String(token || '').trim();
}

/**
 * Calls Molizhishu remote API and unwraps its common response envelope.
 *
 * @param {string} method HTTP method.
 * @param {string} pathOrUrl API path under monitor base URL, or absolute URL.
 * @param {object|null} payload JSON request body.
 * @param {string} source short log source, for example local-api:submit-task.
 * @param {boolean} absolute whether pathOrUrl is already an absolute URL.
 * @returns {Promise<unknown>} response data.
 */
export async function molizhishu(method, pathOrUrl, payload, source, absolute = false) {
  const token = getApiToken();
  if (!token) throw Object.assign(new Error('MOLIZHISHU_TOKEN 未配置'), { httpStatus: 502 });

  const url = absolute ? pathOrUrl : `${config.baseUrl}${pathOrUrl}`;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(payload ? { 'Content-Type': 'application/json' } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const body = await response.text();
    const json = JSON.parse(body);
    console.log(`[molizhishu] source=${source} method=${method} url=${url} http_status=${response.status} success=${json.success} code=${json.code ?? null} message="${json.message || ''}" duration=${Date.now() - started}ms`);
    if (!response.ok) throw Object.assign(new Error(`模力指数 HTTP 异常：${response.status}`), { code: json.code, httpStatus: response.status });
    if (!json.success) throw Object.assign(new Error(json.message || '模力指数业务处理失败'), { code: json.code, httpStatus: 502 });
    return json.data ?? null;
  } finally {
    clearTimeout(timer);
  }
}
