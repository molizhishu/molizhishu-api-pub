SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS geo_tasks (
  task_id VARCHAR(36) NOT NULL COMMENT '模力指数主任务 ID，UUID 字符串',
  status VARCHAR(17) NOT NULL COMMENT '主任务状态：pending/processing/completed/partial_completed/failed/stopped',
  prompts_json JSON NOT NULL COMMENT '提交任务的提示词数组原文',
  platforms_json JSON NOT NULL COMMENT '提交任务的平台配置数组原文',
  region_code_json JSON NOT NULL COMMENT '提交任务的区域编码数组原文',
  callback_url VARCHAR(512) NULL COMMENT '本次任务实际生效的 Callback URL',
  total_items INT NOT NULL DEFAULT 0 COMMENT '子任务总数',
  completed_items INT NOT NULL DEFAULT 0 COMMENT '已完成子任务数',
  failed_items INT NOT NULL DEFAULT 0 COMMENT '失败子任务数',
  poll_url VARCHAR(128) NULL COMMENT '远端状态轮询路径',
  created_at BIGINT NULL COMMENT '远端创建时间，毫秒级 Unix 时间戳',
  completed_at BIGINT NULL COMMENT '远端完成时间，毫秒级 Unix 时间戳',
  raw_request_json JSON NOT NULL COMMENT '提交任务请求原文',
  raw_response_json JSON NULL COMMENT '远端状态或结果响应原文',
  last_error TEXT NULL COMMENT '最近一次同步或处理错误',
  created_local_at DATETIME NOT NULL COMMENT '本地创建时间',
  updated_at DATETIME NOT NULL COMMENT '本地更新时间',
  PRIMARY KEY (task_id),
  INDEX idx_geo_tasks_status (status),
  INDEX idx_geo_tasks_created_local_at (created_local_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模力指数监控主任务';

CREATE TABLE IF NOT EXISTS geo_subtasks (
  subtask_id VARCHAR(19) NOT NULL COMMENT '模力指数子任务 ID，最多 19 位数字字符串',
  task_id VARCHAR(36) NOT NULL COMMENT '所属主任务 ID',
  platform VARCHAR(50) NULL COMMENT 'AI 平台编码',
  mode VARCHAR(16) NULL COMMENT '监控模式',
  prompt TEXT NULL COMMENT '子任务提示词',
  status VARCHAR(10) NULL COMMENT '子任务状态',
  time BIGINT NULL COMMENT '子任务完成时间，毫秒级 Unix 时间戳',
  page_screenshot VARCHAR(500) NULL COMMENT '页面截图 URL',
  answer_content TEXT NULL COMMENT 'AI 回答内容，Markdown 或混合 HTML',
  reference_list_json JSON NULL COMMENT '全部引用来源列表',
  citation_list_json JSON NULL COMMENT '文内实际引用来源列表',
  reasoning_process_json JSON NULL COMMENT '推理过程对象',
  recommended_questions_json JSON NULL COMMENT '推荐追问数组',
  media_content_json JSON NULL COMMENT '媒体内容数组',
  error_message TEXT NULL COMMENT '子任务失败原因',
  proxy_ip VARCHAR(45) NULL COMMENT '执行节点 IP，兼容 IPv4/IPv6',
  raw_result_json JSON NULL COMMENT '子任务完整原始结果',
  updated_at DATETIME NOT NULL COMMENT '本地更新时间',
  PRIMARY KEY (subtask_id),
  INDEX idx_geo_subtasks_task_id (task_id),
  CONSTRAINT fk_geo_subtasks_task_id FOREIGN KEY (task_id) REFERENCES geo_tasks(task_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模力指数监控子任务';

CREATE TABLE IF NOT EXISTS geo_callback_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增 ID',
  task_id VARCHAR(36) NOT NULL COMMENT '回调所属主任务 ID',
  payload_json JSON NOT NULL COMMENT 'Callback 请求体原文',
  payload_hash CHAR(64) NOT NULL COMMENT 'Callback payload SHA-256 哈希',
  process_status VARCHAR(20) NOT NULL COMMENT '处理状态：processing/processed/duplicate/failed',
  error_message TEXT NULL COMMENT '处理失败原因',
  received_at DATETIME NOT NULL COMMENT '本地接收时间',
  processed_at DATETIME NULL COMMENT '本地处理完成时间',
  PRIMARY KEY (id),
  INDEX idx_geo_callback_events_task_id (task_id),
  INDEX idx_geo_callback_events_hash (task_id, payload_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模力指数 Callback 处理记录';

CREATE TABLE IF NOT EXISTS geo_compensation_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增 ID',
  task_id VARCHAR(36) NOT NULL COMMENT '补偿同步的主任务 ID',
  source VARCHAR(80) NOT NULL COMMENT '触发来源',
  action VARCHAR(40) NOT NULL COMMENT '同步动作：status/result',
  request_url VARCHAR(512) NULL COMMENT '远端请求地址',
  http_status INT NULL COMMENT '远端 HTTP 状态码',
  success TINYINT(1) NULL COMMENT '远端业务 success',
  code INT NULL COMMENT '远端业务 code',
  message VARCHAR(500) NULL COMMENT '远端业务 message',
  error_message TEXT NULL COMMENT '本地错误信息',
  started_at DATETIME NOT NULL COMMENT '同步开始时间',
  finished_at DATETIME NULL COMMENT '同步结束时间',
  PRIMARY KEY (id),
  INDEX idx_geo_compensation_events_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模力指数补偿同步记录';

CREATE TABLE IF NOT EXISTS geo_admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增 ID',
  username VARCHAR(64) NOT NULL COMMENT '登录账号',
  password_hash VARCHAR(255) NOT NULL COMMENT 'BCrypt 密码哈希',
  display_name VARCHAR(80) NOT NULL DEFAULT '管理员' COMMENT '显示名称',
  role VARCHAR(40) NOT NULL DEFAULT 'admin' COMMENT '用户角色',
  status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '账号状态：1 启用，0 禁用',
  auth_token_hash CHAR(64) NULL COMMENT '登录 Token SHA-256 哈希',
  token_expires_at DATETIME NULL COMMENT 'Token 过期时间',
  last_login_at DATETIME NULL COMMENT '最后登录时间',
  last_login_ip VARCHAR(45) NULL COMMENT '最后登录 IP，兼容 IPv4/IPv6',
  created_at DATETIME NOT NULL COMMENT '创建时间',
  updated_at DATETIME NOT NULL COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_geo_admin_users_username (username),
  INDEX idx_geo_admin_users_token_hash (auth_token_hash),
  INDEX idx_geo_admin_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台管理员用户';

INSERT INTO geo_admin_users (
  username,
  password_hash,
  display_name,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  'admin',
  '$2y$12$CRMvCFMLeMsVqON5yJSUG.2m1a43hnfDlREAemSVq0FuO0OH7Lc3m',
  '系统管理员',
  'admin',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  role = VALUES(role),
  status = VALUES(status),
  updated_at = NOW();
