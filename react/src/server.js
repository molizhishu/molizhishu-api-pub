import express from 'express';
import bcrypt from 'bcryptjs';

import { getApiToken, molizhishu, updateApiToken } from './client.js';
import { config } from './config.js';
import {
  authenticate,
  findAdminByUsername,
  issueToken,
  listTasks,
  logoutUser,
  saveCallback,
  saveSubmitted,
  taskDetail
} from './repository.js';
import { startBackgroundSync } from './scheduler.js';
import { syncOne, syncUnfinished } from './syncer.js';
import { bearerToken, mask, normalizeBcrypt, ok, publicUser, validateSubmit } from './utils.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/') || ['/api/health', '/api/auth/login'].includes(req.path)) return next();
  const user = await authenticate(bearerToken(req));
  if (!user) return res.status(401).json({ success: false, message: '请先登录' });
  req.user = user;
  next();
});

app.get('/api/health', (_, res) => res.json(ok({ service: config.serviceName, status: 'ok' })));

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const user = await findAdminByUsername(username);
  if (!user || !password || !bcrypt.compareSync(password, normalizeBcrypt(user.password_hash))) {
    return res.status(401).json({ success: false, message: '账号或密码不正确' });
  }
  const { token, expiresAt } = await issueToken(user, req.ip);
  res.json(ok({ token, expiresAt, user: publicUser(user) }));
});

app.get('/api/auth/me', (req, res) => res.json(ok(publicUser(req.user))));
app.post('/api/auth/logout', async (req, res) => {
  await logoutUser(req.user.id);
  res.json(ok(true));
});

app.post('/api/tasks', async (req, res, next) => {
  try {
    const error = validateSubmit(req.body);
    if (error) return res.status(422).json({ success: false, message: error });
    const payload = { ...req.body };
    if (!payload.callbackUrl && config.callbackUrl) payload.callbackUrl = config.callbackUrl;
    const data = await molizhishu('POST', '/task/batch/shared', payload, 'local-api:submit-task');
    await saveSubmitted(payload, data);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
});

app.get('/api/tasks', async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const size = Math.min(100, Math.max(1, Number(req.query.size || 20)));
  const status = String(req.query.status || '');
  const { total, items } = await listTasks(page, size, status);
  res.json(ok({ page, size, total, items }));
});

app.get('/api/tasks/:taskId', async (req, res) => {
  const task = await taskDetail(req.params.taskId);
  if (!task) return res.status(404).json({ success: false, message: '任务不存在' });
  res.json(ok(task));
});

app.post('/api/tasks/:taskId/sync', async (req, res, next) => {
  try {
    res.json(ok(await syncOne(req.params.taskId, 'local-api:manual-compensation')));
  } catch (error) {
    next(error);
  }
});

app.put('/api/tasks/:taskId/stop', async (req, res, next) => {
  try {
    const message = await molizhishu('PUT', `/task/${encodeURIComponent(req.params.taskId)}/stop`, null, 'local-api:stop-task');
    res.json(ok({ message }));
  } catch (error) {
    next(error);
  }
});

app.post('/webhooks/molizhishu', async (req, res, next) => {
  try {
    if (!req.body?.taskId || !req.body?.status) return res.status(400).json({ success: false, message: 'taskId 和 status 必填' });
    const duplicate = await saveCallback(req.body);
    res.json(ok({ duplicate }));
  } catch (error) {
    next(error);
  }
});

app.get('/api/callback-url', async (_, res, next) => {
  try {
    res.json(ok(await molizhishu('GET', '/task/callback-url', null, 'local-api:callback-url:get')));
  } catch (error) {
    next(error);
  }
});

app.put('/api/callback-url', async (req, res, next) => {
  try {
    res.json(ok(await molizhishu('PUT', '/task/callback-url', { callbackUrl: req.body?.callbackUrl ?? null }, 'local-api:callback-url:update')));
  } catch (error) {
    next(error);
  }
});

app.get('/api/cities', async (_, res, next) => {
  try {
    res.json(ok(await molizhishu('GET', config.cityUrl, null, 'local-api:cities', true)));
  } catch (error) {
    next(error);
  }
});

app.get('/api/settings', (_, res) => res.json(ok({ apiKey: mask(getApiToken()), security: { apiKeyUpdateAllowed: config.allowApiKeyUpdate } })));
app.put('/api/settings/api-key', (req, res) => {
  if (!config.allowApiKeyUpdate) return res.status(403).json({ success: false, message: '当前环境禁止在页面修改 API Key' });
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!apiKey) return res.status(422).json({ success: false, message: 'API Key 不能为空' });
  updateApiToken(apiKey);
  res.json(ok({ apiKey: mask(getApiToken()), security: { apiKeyUpdateAllowed: config.allowApiKeyUpdate } }));
});

app.use((error, _req, res, _next) => {
  const status = error.httpStatus && error.httpStatus >= 400 ? error.httpStatus : 502;
  res.status(status).json({ success: false, code: error.code ?? null, message: error.message || '请求失败' });
});

app.listen(config.port, () => {
  console.log(`${config.serviceName} listening on ${config.port}`);
  startBackgroundSync({
    enabled: config.syncEnabled,
    intervalMs: config.syncIntervalMs,
    limit: config.syncLimit,
    source: 'node-sync-loop',
    syncUnfinished
  });
});
