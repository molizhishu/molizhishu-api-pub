import crypto from 'node:crypto';

export function ok(data) {
  return { success: true, data };
}

export function json(value) {
  return JSON.stringify(value ?? null);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function bearerToken(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

export function normalizeBcrypt(hash) {
  return String(hash || '').replace(/^\$2y\$/, '$2a$');
}

export function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role };
}

export function mysqlDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: process.env.TZ || 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || '00';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`;
}

export function mask(value) {
  const token = String(value || '').trim();
  if (!token) return { configured: false, masked: null, last4: null };
  const last4 = token.slice(-4);
  return { configured: true, masked: '*'.repeat(Math.max(8, token.length - 4)) + last4, last4 };
}

export function validateSubmit(payload) {
  if (!Array.isArray(payload?.prompts) || payload.prompts.length === 0) return 'prompts 必须是非空数组';
  if (payload.prompts.length > 50) return 'prompts 最多 50 个';
  if (!Array.isArray(payload.platforms) || payload.platforms.length === 0) return 'platforms 必须是非空数组';
  if (payload.platforms.some((item) => !item?.platform || !item?.mode)) return 'platforms 每一项必须包含 platform 和 mode';
  return null;
}

export function terminalStatus(status) {
  return ['completed', 'partial_completed', 'failed', 'stopped'].includes(status);
}

export function hasCompletedItems(status) {
  if (Number(status?.completedItems || 0) > 0) return true;
  return Array.isArray(status?.subTaskList) && status.subTaskList.some((item) => terminalStatus(item?.status));
}
