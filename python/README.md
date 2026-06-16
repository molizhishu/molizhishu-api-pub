# Python API 对接 Demo

基于 Python 3.11、FastAPI、SQLAlchemy、httpx、APScheduler、MySQL 的模力指数监控 API 对接示例。

## 快速开始

```bash
cd python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS molizhishu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p molizhishu < database/schema.sql
uvicorn app.main:app --host 0.0.0.0 --port 18083 --reload
```

## 本地接口

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/auth/login` | 管理员登录 |
| `GET` | `/api/auth/me` | 当前登录用户 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `POST` | `/api/tasks` | 创建监控任务 |
| `GET` | `/api/tasks` | 查询本地任务列表 |
| `GET` | `/api/tasks/{task_id}` | 查询本地任务详情 |
| `POST` | `/api/tasks/{task_id}/sync` | 手动补偿同步 |
| `PUT` | `/api/tasks/{task_id}/stop` | 停止未完成任务 |
| `POST` | `/webhooks/molizhishu` | 接收模力指数 Callback |
| `GET` | `/api/callback-url` | 查询全局 Callback |
| `PUT` | `/api/callback-url` | 设置或清空全局 Callback |
| `GET` | `/api/cities` | 查询可用区域 |

## 说明

- 远端返回 `success=false` 时会抛出业务异常，即使 HTTP 状态码是 200。
- Callback 幂等键为 `task_id + payload_hash`。
- FastAPI 服务启动后会通过 lifespan 挂载 APScheduler 进程内后台同步任务，默认每 60 秒扫描一次未完成或结果未完整入库的任务；只要状态接口出现已完成子任务，就会继续拉取结果接口。调度入口在 `app/schedule.py`，同步业务在 `app/syncer.py`，数据库访问在 `app/repository.py`。
- `GET /api/tasks` 和 `GET /api/tasks/{task_id}` 只查本地数据库，不主动调用远端。
- 除登录、健康检查和 Callback 外，`/api/**` 默认需要 `Authorization: Bearer <token>`，兼容根目录 `frontend/` 的登录流程。
- 默认管理员为 `admin / molizhishu`，初始化 SQL 会写入 `geo_admin_users` 表。生产部署后请修改默认密码。
- `app/repository.py` 返回给前端的 MySQL JSON 字段会统一转换成 JSON 字符串，例如 `prompts_json`、`platforms_json`、`region_code_json`。
- 保存远端状态/结果时不能覆盖本地提交时保存的提示词、平台和区域配置；如果历史数据已被清空，可从子任务的 `prompt/platform/mode` 回填主任务。

后台同步配置：`MOLIZHISHU_SYNC_ENABLED=true`、`MOLIZHISHU_SYNC_INTERVAL_SECONDS=60`、`MOLIZHISHU_SYNC_LIMIT=20`。

## 与公共前端保持一致

本 demo 复用根目录 `frontend/`，因此本地 API 字段和行为必须与其它语言保持一致。修改以下内容时需要同步检查所有语言：

- `/api/tasks` 和 `/api/tasks/{task_id}` 的响应字段名和字段类型。
- `prompts_json`、`platforms_json`、`region_code_json` 必须返回 JSON 字符串。
- 后台同步不能把提交参数覆盖成空数组。
- 控制台统计口径是子任务数，不是主任务条数。

完整契约见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。

## 目录结构

- `app/main.py`：FastAPI 应用装配、路由挂载、统一异常处理和鉴权中间件。
- `app/api/`：按业务拆分的路由模块，包含 `auth`、`tasks`、`callbacks`、`settings` 和 `health`。
- `app/dependencies.py`：FastAPI 依赖注入，负责创建 Repository 和 Molizhishu Client。
- `app/security.py`：Bearer Token 提取、bcrypt 校验和 API Key 脱敏。
- `app/molizhishu_client.py`：模力指数远端 API Client，统一处理响应 envelope、业务错误和日志。
- `app/repository.py`：SQLAlchemy 数据访问层，保存任务、子任务、Callback 和登录 token。
- `app/schedule.py`：FastAPI lifespan + APScheduler 调度入口，只负责触发后台同步。
- `app/syncer.py`：后台补偿同步和手动同步业务逻辑。
- `app/models.py`：`geo_` 表对应的 SQLAlchemy 模型。

## Docker

```bash
cp docker.env.example docker.env
sh scripts/docker-up.sh
```

默认 API 端口为 `18083`，数据库表使用 `geo_` 前缀。

Docker 默认使用 `TZ=Asia/Shanghai`，MySQL 使用 `MYSQL_TIME_ZONE=+08:00`。本地 `DATETIME` 字段按东八区保存，远端毫秒级时间戳由公共前端按东八区显示。

Docker Compose 会同时启动公共前端、Python API 和 MySQL。默认访问：前端 `http://127.0.0.1:18000`，API `http://127.0.0.1:18083`。如需修改前端端口，请在 `docker.env` 中调整 `WEB_PORT`。

如果旧版本已经初始化过数据库，Compose 不会自动重跑建表脚本。测试环境可删除旧 volume 后重建；生产环境请先备份并迁移数据。

默认允许在设置页配置 API Key，便于 demo 试用：

```dotenv
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
```

生产环境如需锁定服务端配置，可改为 `false`。
