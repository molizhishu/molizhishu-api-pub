SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  task_id VARCHAR(80) PRIMARY KEY,
  status VARCHAR(40) NOT NULL,
  prompts_json JSON NOT NULL,
  platforms_json JSON NOT NULL,
  region_code_json JSON NOT NULL,
  callback_url VARCHAR(500) NULL,
  total_items INT NOT NULL DEFAULT 0,
  completed_items INT NOT NULL DEFAULT 0,
  failed_items INT NOT NULL DEFAULT 0,
  poll_url VARCHAR(500) NULL,
  created_at BIGINT NULL,
  completed_at DATETIME NULL,
  raw_request_json JSON NOT NULL,
  raw_response_json JSON NULL,
  last_error TEXT NULL,
  created_local_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_created_local_at (created_local_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subtasks (
  subtask_id VARCHAR(80) PRIMARY KEY,
  task_id VARCHAR(80) NOT NULL,
  platform VARCHAR(80) NULL,
  mode VARCHAR(80) NULL,
  prompt TEXT NULL,
  status VARCHAR(40) NULL,
  time VARCHAR(32) NULL,
  page_screenshot VARCHAR(1000) NULL,
  answer_content MEDIUMTEXT NULL,
  reference_list_json JSON NULL,
  citation_list_json JSON NULL,
  reasoning_process_json JSON NULL,
  recommended_questions_json JSON NULL,
  media_content_json JSON NULL,
  error_message TEXT NULL,
  proxy_ip VARCHAR(64) NULL,
  raw_result_json JSON NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_subtasks_task_id (task_id),
  CONSTRAINT fk_subtasks_task_id FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS callback_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id VARCHAR(80) NOT NULL,
  payload_json JSON NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  process_status VARCHAR(40) NOT NULL,
  error_message TEXT NULL,
  received_at DATETIME NOT NULL,
  processed_at DATETIME NULL,
  INDEX idx_callback_events_task_id (task_id),
  INDEX idx_callback_events_hash (task_id, payload_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compensation_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id VARCHAR(80) NOT NULL,
  source VARCHAR(80) NOT NULL,
  action VARCHAR(40) NOT NULL,
  request_url VARCHAR(500) NULL,
  http_status INT NULL,
  success TINYINT(1) NULL,
  code INT NULL,
  message VARCHAR(500) NULL,
  error_message TEXT NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  INDEX idx_compensation_events_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(80) NOT NULL DEFAULT '管理员',
  role VARCHAR(40) NOT NULL DEFAULT 'admin',
  status TINYINT(1) NOT NULL DEFAULT 1,
  auth_token_hash CHAR(64) NULL,
  token_expires_at DATETIME NULL,
  last_login_at DATETIME NULL,
  last_login_ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_admin_users_username (username),
  INDEX idx_admin_users_token_hash (auth_token_hash),
  INDEX idx_admin_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_users (
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
