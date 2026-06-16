# React Node.js API 对接 Demo

这是面向 React 技术栈客户的 **纯 Node.js 后端 API** 示例，并不是浏览器端 React 项目。它基于 Express、mysql2、bcryptjs、MySQL，对接模力指数监控 API，并兼容根目录 `frontend/` 的登录和任务流程。

## 快速开始

```bash
cd react
npm install
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS molizhishu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p molizhishu < database/schema.sql
export MOLIZHISHU_TOKEN=你的 API Key
npm start
```

默认 API 端口为 `18086`。默认管理员为 `admin / molizhishu`。

服务启动后会通过 Node.js 进程内定时器运行后台同步，默认每 60 秒扫描一次未完成或结果未完整入库的任务。调度入口在 `src/scheduler.js`，同步业务在 `src/syncer.js`，数据库访问在 `src/repository.js`。相关配置：`MOLIZHISHU_SYNC_ENABLED=true`、`MOLIZHISHU_SYNC_INTERVAL_SECONDS=60`、`MOLIZHISHU_SYNC_LIMIT=20`。

## 与公共前端保持一致

本 demo 复用根目录 `frontend/`，因此本地 API 字段和行为必须与其它语言保持一致。修改以下内容时需要同步检查所有语言：

- `/api/tasks` 和 `/api/tasks/:taskId` 的响应字段名和字段类型。
- `prompts_json`、`platforms_json`、`region_code_json` 必须返回 JSON 字符串。
- 后台同步不能把提交参数覆盖成空数组。
- 控制台统计口径是子任务数，不是主任务条数。

完整契约见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。

## 目录结构

- `src/server.js`：Express 启动入口、路由注册、鉴权中间件和错误处理。
- `src/config.js`：环境变量配置解析，API Key 只在服务端读取。
- `src/client.js`：模力指数远端 API Client，统一处理超时、响应 envelope、业务错误和日志。
- `src/database.js`：MySQL 连接池。
- `src/repository.js`：任务、子任务、Callback 和登录 token 的数据库访问。
- `src/syncer.js`：手动同步和后台补偿同步业务逻辑。
- `src/utils.js`：响应 envelope、哈希、日期、校验等通用工具。
- `src/scheduler.js`：Node.js 后台补偿同步定时器，只负责触发，不保存业务数据。
- `database/schema.sql`：统一 `geo_` 表结构和默认管理员账号。

## Docker

```bash
cp docker.env.example docker.env
sh scripts/docker-up.sh
```

Docker 默认使用 `TZ=Asia/Shanghai`，MySQL 使用 `MYSQL_TIME_ZONE=+08:00`。本地 `DATETIME` 字段按东八区保存，远端毫秒级时间戳由公共前端按东八区显示。

Docker Compose 会同时启动公共前端、React Node API 和 MySQL。默认访问：前端 `http://127.0.0.1:18000`，API `http://127.0.0.1:18086`。如需修改前端端口，请在 `docker.env` 中调整 `WEB_PORT`。

默认允许在设置页配置 API Key，便于 demo 试用：

```dotenv
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
```

生产环境如需锁定服务端配置，可改为 `false`。
