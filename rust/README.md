# Rust API 对接 Demo

基于 Rust、Axum、sqlx、MySQL 的模力指数监控 API 对接示例，兼容根目录 `frontend/` 的登录和任务流程。

## 快速开始

```bash
cd rust
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS molizhishu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p molizhishu < database/schema.sql
export DATABASE_URL=mysql://root:your_mysql_password@127.0.0.1:3306/molizhishu
export MOLIZHISHU_TOKEN=你的 API Key
cargo run
```

默认 API 端口为 `18085`。默认管理员为 `admin / molizhishu`。

服务启动后会通过 `tokio::spawn` + `tokio::time::interval` 运行进程内后台同步，默认每 60 秒扫描一次未完成或结果未完整入库的任务。`sync_loop` 只负责定时触发，`sync_one`/`sync_unfinished` 负责同步业务。相关配置：`MOLIZHISHU_SYNC_ENABLED=true`、`MOLIZHISHU_SYNC_INTERVAL_SECONDS=60`、`MOLIZHISHU_SYNC_LIMIT=20`。

## 与公共前端保持一致

本 demo 复用根目录 `frontend/`，因此本地 API 字段和行为必须与其它语言保持一致。修改以下内容时需要同步检查所有语言：

- `/api/tasks` 和 `/api/tasks/{taskId}` 的响应字段名和字段类型。
- `prompts_json`、`platforms_json`、`region_code_json` 必须返回 JSON 字符串。
- 后台同步不能把提交参数覆盖成空数组。
- 控制台统计口径是子任务数，不是主任务条数。

完整契约见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。

## 目录结构

- `src/main.rs`：Axum 启动入口、路由注册、接口参数校验和登录鉴权。
- `src/state.rs`：Axum handler 与后台任务共享的应用状态。
- `src/client.rs`：模力指数远端 API Client，统一处理鉴权、响应 envelope、业务错误和日志。
- `src/repository.rs`：MySQL 持久化、任务/子任务/callback 事件保存和数据库行映射。
- `src/syncer.rs`：后台补偿同步与手动同步逻辑，使用 Tokio interval 触发。
- `src/config.rs`：环境变量配置解析。
- `src/response.rs`：统一本地 API 响应 envelope 和错误类型。
- `src/util.rs`：哈希、JSON 序列化、MySQL 行读取等通用工具。
- `database/schema.sql`：统一 `geo_` 表结构和默认管理员账号。

## Docker

```bash
cp docker.env.example docker.env
sh scripts/docker-up.sh
```

Docker 默认使用 `TZ=Asia/Shanghai`，MySQL 使用 `MYSQL_TIME_ZONE=+08:00`。本地 `DATETIME` 字段按东八区保存，远端毫秒级时间戳由公共前端按东八区显示。

Docker Compose 会同时启动公共前端、Rust API 和 MySQL。默认访问：前端 `http://127.0.0.1:18000`，API `http://127.0.0.1:18085`。如需修改前端端口，请在 `docker.env` 中调整 `WEB_PORT`。

默认允许在设置页配置 API Key，便于 demo 试用：

```dotenv
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
```

生产环境如需锁定服务端配置，可改为 `false`。
