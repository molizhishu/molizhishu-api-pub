import crypto from 'node:crypto';

import { pool } from './database.js';
import { json, mysqlDate, sha256 } from './utils.js';

const TASK_JSON_FIELDS = ['prompts_json', 'platforms_json', 'region_code_json', 'raw_request_json', 'raw_response_json'];
const SUBTASK_JSON_FIELDS = [
  'reference_list_json',
  'citation_list_json',
  'reasoning_process_json',
  'recommended_questions_json',
  'media_content_json',
  'raw_result_json'
];
const CALLBACK_JSON_FIELDS = ['payload_json'];

function jsonColumn(value) {
  if (value == null) return value;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function normalizeJsonColumns(row, fields) {
  if (!row) return row;
  const normalized = { ...row };
  for (const field of fields) {
    if (field in normalized) normalized[field] = jsonColumn(normalized[field]);
  }
  return normalized;
}

/** Finds an enabled admin user by username. */
export async function findAdminByUsername(username) {
  const [[user]] = await pool.query('SELECT * FROM geo_admin_users WHERE username = ? AND status = 1', [username]);
  return user || null;
}

/** Issues a frontend Bearer token and stores only its SHA-256 hash. */
export async function issueToken(user, ip) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400 * 1000);
  await pool.query('UPDATE geo_admin_users SET auth_token_hash=?, token_expires_at=?, last_login_at=NOW(), last_login_ip=?, updated_at=NOW() WHERE id=?', [
    sha256(token), mysqlDate(expiresAt), ip, user.id
  ]);
  return { token, expiresAt: mysqlDate(expiresAt) };
}

/** Loads the current admin user from a Bearer token. */
export async function authenticate(token) {
  if (!token) return null;
  const [[user]] = await pool.query('SELECT * FROM geo_admin_users WHERE auth_token_hash=? AND status=1 AND token_expires_at > NOW()', [sha256(token)]);
  return user || null;
}

export async function logoutUser(userId) {
  await pool.query('UPDATE geo_admin_users SET auth_token_hash=NULL, token_expires_at=NULL, updated_at=NOW() WHERE id=?', [userId]);
}

export async function listTasks(page, size, status) {
  const where = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM geo_tasks ${where}`, params);
  const [items] = await pool.query(`SELECT * FROM geo_tasks ${where} ORDER BY created_local_at DESC LIMIT ? OFFSET ?`, [...params, size, (page - 1) * size]);
  return { total, items: items.map((item) => normalizeJsonColumns(item, TASK_JSON_FIELDS)) };
}

export async function taskDetail(taskId) {
  const [[task]] = await pool.query('SELECT * FROM geo_tasks WHERE task_id = ?', [taskId]);
  if (!task) return null;
  const [subTaskList] = await pool.query('SELECT * FROM geo_subtasks WHERE task_id = ? ORDER BY updated_at DESC', [taskId]);
  const [callbackEvents] = await pool.query('SELECT * FROM geo_callback_events WHERE task_id = ? ORDER BY received_at DESC LIMIT 20', [taskId]);
  return {
    ...normalizeJsonColumns(task, TASK_JSON_FIELDS),
    subTaskList: subTaskList.map((item) => normalizeJsonColumns(item, SUBTASK_JSON_FIELDS)),
    callbackEvents: callbackEvents.map((item) => normalizeJsonColumns(item, CALLBACK_JSON_FIELDS))
  };
}

export async function saveSubmitted(request, response) {
  const now = mysqlDate();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`INSERT INTO geo_tasks (task_id,status,prompts_json,platforms_json,region_code_json,callback_url,total_items,completed_items,failed_items,poll_url,raw_request_json,raw_response_json,created_local_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE status=VALUES(status),prompts_json=VALUES(prompts_json),platforms_json=VALUES(platforms_json),region_code_json=VALUES(region_code_json),callback_url=VALUES(callback_url),total_items=VALUES(total_items),poll_url=VALUES(poll_url),raw_request_json=VALUES(raw_request_json),raw_response_json=VALUES(raw_response_json),updated_at=VALUES(updated_at)`,
      [response.taskId, response.status || 'pending', json(request.prompts || []), json(request.platforms || []), json(request.regionCode || []), response.callbackUrl || request.callbackUrl || null, response.totalTask || response.totalItems || 0, 0, 0, response.pollUrl || null, json(request), json(response), now, now]);
    await upsertSubtasks(conn, response.taskId, response.subTaskList || [], now);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function saveRemoteResult(payload) {
  const now = mysqlDate();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`INSERT INTO geo_tasks (task_id,status,prompts_json,platforms_json,region_code_json,total_items,completed_items,failed_items,created_at,completed_at,raw_request_json,raw_response_json,created_local_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE status=VALUES(status),total_items=VALUES(total_items),completed_items=VALUES(completed_items),failed_items=VALUES(failed_items),created_at=VALUES(created_at),completed_at=VALUES(completed_at),raw_response_json=VALUES(raw_response_json),updated_at=VALUES(updated_at)`,
      [payload.taskId, payload.status || 'processing', '[]', '[]', '[]', payload.totalItems || 0, payload.completedItems || 0, payload.failedItems || 0, payload.createdAt || null, payload.completedAt || payload.timestamp || null, '{}', json(payload), now, now]);
    await upsertSubtasks(conn, payload.taskId, payload.subTaskList || [], now);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function saveCallback(payload) {
  const raw = json(payload);
  const hash = sha256(raw);
  const [[exists]] = await pool.query('SELECT COUNT(*) count FROM geo_callback_events WHERE task_id=? AND payload_hash=? AND process_status=?', [payload.taskId, hash, 'processed']);
  if (exists.count > 0) {
    await pool.query('INSERT INTO geo_callback_events (task_id,payload_json,payload_hash,process_status,received_at,processed_at) VALUES (?,?,?,?,NOW(),NOW())', [payload.taskId, raw, hash, 'duplicate']);
    return true;
  }
  await pool.query('INSERT INTO geo_callback_events (task_id,payload_json,payload_hash,process_status,received_at,processed_at) VALUES (?,?,?,?,NOW(),NOW())', [payload.taskId, raw, hash, 'processed']);
  await saveRemoteResult(payload);
  return false;
}

export async function unfinishedTaskIds(limit) {
  const [rows] = await pool.query(`SELECT t.task_id
    FROM geo_tasks t
    LEFT JOIN geo_subtasks s ON s.task_id = t.task_id
    WHERE t.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
       OR s.subtask_id IS NULL
       OR s.status IS NULL
       OR s.status NOT IN ('completed', 'partial_completed', 'failed', 'stopped')
       OR (t.status IN ('completed', 'partial_completed') AND s.status = 'completed' AND (s.answer_content IS NULL OR s.answer_content = ''))
    GROUP BY t.task_id
    ORDER BY MIN(t.created_local_at) ASC
    LIMIT ?`, [limit]);
  return rows.map((row) => row.task_id);
}

async function upsertSubtasks(conn, taskId, rows, now) {
  for (const row of rows) {
    if (!row.subTaskId) continue;
    await conn.execute(`INSERT INTO geo_subtasks (subtask_id,task_id,platform,mode,prompt,status,time,page_screenshot,answer_content,reference_list_json,citation_list_json,reasoning_process_json,recommended_questions_json,media_content_json,error_message,proxy_ip,raw_result_json,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE platform=VALUES(platform),mode=VALUES(mode),prompt=VALUES(prompt),status=VALUES(status),time=VALUES(time),page_screenshot=VALUES(page_screenshot),answer_content=VALUES(answer_content),reference_list_json=VALUES(reference_list_json),citation_list_json=VALUES(citation_list_json),reasoning_process_json=VALUES(reasoning_process_json),recommended_questions_json=VALUES(recommended_questions_json),media_content_json=VALUES(media_content_json),error_message=VALUES(error_message),proxy_ip=VALUES(proxy_ip),raw_result_json=VALUES(raw_result_json),updated_at=VALUES(updated_at)`,
      [row.subTaskId, taskId, row.platform || null, row.mode || null, row.prompt || null, row.status || null, row.time || null, row.pageScreenshot || null, row.answerContent || null, json(row.referenceList || []), json(row.citationList || []), json(row.reasoningProcess ?? null), json(row.recommendedQuestions || []), json(row.mediaContent || []), row.errorMessage || null, row.proxyIp || null, json(row), now]);
  }
}
