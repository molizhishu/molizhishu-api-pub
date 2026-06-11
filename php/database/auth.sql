SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

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
