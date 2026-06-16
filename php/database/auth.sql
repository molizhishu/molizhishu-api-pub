SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

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
