/**
 * Environment-backed configuration for the React-stack Node.js API demo.
 * The token is intentionally server-only and must never be exposed to browsers.
 */
export const config = {
  serviceName: env('SERVICE_NAME', 'molizhishu-api-pub-react-node'),
  port: Number(env('APP_PORT', '18086')),
  db: {
    host: env('DATABASE_HOST', '127.0.0.1'),
    port: Number(env('DATABASE_PORT', '3306')),
    database: env('DATABASE_NAME', 'molizhishu'),
    user: env('DATABASE_USER', 'root'),
    password: env('DATABASE_PASSWORD', ''),
    charset: 'utf8mb4',
    timezone: '+08:00'
  },
  token: env('MOLIZHISHU_TOKEN', ''),
  baseUrl: env('MOLIZHISHU_BASE_URL', 'https://business-api.molizhishu.com/api/business/monitor').replace(/\/$/, ''),
  cityUrl: env('MOLIZHISHU_CITY_URL', 'https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info'),
  callbackUrl: env('MOLIZHISHU_CALLBACK_URL', ''),
  allowApiKeyUpdate: env('MOLIZHISHU_ALLOW_API_KEY_UPDATE', 'true') === 'true',
  timeoutMs: Number(env('MOLIZHISHU_TIMEOUT_SECONDS', '30')) * 1000,
  syncEnabled: env('MOLIZHISHU_SYNC_ENABLED', 'true') !== 'false',
  syncIntervalMs: Math.max(1, Number(env('MOLIZHISHU_SYNC_INTERVAL_SECONDS', '60'))) * 1000,
  syncLimit: Math.max(1, Number(env('MOLIZHISHU_SYNC_LIMIT', '20')))
};

function env(key, fallback) {
  return process.env[key] || fallback;
}
