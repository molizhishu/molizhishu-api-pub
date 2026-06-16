# ASP.NET Core API 对接 Demo

基于 .NET 10、ASP.NET Core Minimal API、Dapper、MySqlConnector、MySQL 的模力指数监控 API 对接示例。

## 快速开始

```bash
cd dotnet
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS molizhishu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p molizhishu < database/schema.sql
export DATABASE_CONNECTION='Server=127.0.0.1;Port=3306;Database=molizhishu;User ID=root;Password=your_mysql_password;CharSet=utf8mb4;'
export MOLIZHISHU_TOKEN=你的 API Key
dotnet run
```

默认 API 端口为 `18084`。默认管理员为 `admin / molizhishu`，初始化 SQL 会写入 `geo_admin_users` 表。生产部署后请修改默认密码。

## 本地接口

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/auth/login` | 管理员登录 |
| `GET` | `/api/auth/me` | 当前登录用户 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `POST` | `/api/tasks` | 创建监控任务 |
| `GET` | `/api/tasks` | 查询本地任务列表 |
| `GET` | `/api/tasks/{taskId}` | 查询本地任务详情 |
| `POST` | `/api/tasks/{taskId}/sync` | 手动补偿同步 |
| `PUT` | `/api/tasks/{taskId}/stop` | 停止未完成任务 |
| `POST` | `/webhooks/molizhishu` | 接收模力指数 Callback |
| `GET` | `/api/callback-url` | 查询全局 Callback |
| `PUT` | `/api/callback-url` | 设置或清空全局 Callback |
| `GET` | `/api/cities` | 查询可用区域 |
| `GET` | `/api/settings` | 设置页读取 |
| `PUT` | `/api/settings/api-key` | 设置页更新 API Key，默认允许；运行期立即生效，容器重启后仍以环境变量为准 |

除登录、健康检查和 Callback 外，`/api/**` 默认需要 `Authorization: Bearer <token>`，兼容根目录 `frontend/` 的登录流程。

服务启动后会通过 ASP.NET Core `BackgroundService` 运行进程内后台同步，默认每 60 秒扫描一次未完成或结果未完整入库的任务。`BackgroundTaskSyncService` 只负责调度，`TaskSyncService` 负责同步业务。相关配置：`MOLIZHISHU_SYNC_ENABLED=true`、`MOLIZHISHU_SYNC_INTERVAL_SECONDS=60`、`MOLIZHISHU_SYNC_LIMIT=20`。

## 与公共前端保持一致

本 demo 复用根目录 `frontend/`，因此本地 API 字段和行为必须与其它语言保持一致。修改以下内容时需要同步检查所有语言：

- `/api/tasks` 和 `/api/tasks/{taskId}` 的响应字段名和字段类型。
- `prompts_json`、`platforms_json`、`region_code_json` 必须返回 JSON 字符串。
- 后台同步不能把提交参数覆盖成空数组。
- 控制台统计口径是子任务数，不是主任务条数。

完整契约见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。

## 目录结构

- `Program.cs`：Minimal API 路由、中间件和依赖注入入口。
- `Config/`：环境变量配置。
- `Client/`：模力指数远端 API 客户端。
- `Data/`：Dapper/MySQL 持久化和本地管理员模型。
- `Services/`：任务同步等业务服务。
- `Hosting/`：ASP.NET Core 后台服务，负责定时触发补偿同步。
- `Support/`：响应 envelope、请求校验、安全工具、异常、JSON 扩展、哈希等通用工具。

## Docker

```bash
cp docker.env.example docker.env
sh scripts/docker-up.sh
```

如果旧版本已经初始化过数据库，Compose 不会自动重跑建表脚本。测试环境可删除旧 volume 后重建；生产环境请先备份并迁移数据。

Docker 默认使用 `TZ=Asia/Shanghai`，MySQL 使用 `MYSQL_TIME_ZONE=+08:00`。本地 `DATETIME` 字段按东八区保存，远端毫秒级时间戳由公共前端按东八区显示。

Docker Compose 会同时启动公共前端、ASP.NET Core API 和 MySQL。默认访问：前端 `http://127.0.0.1:18000`，API `http://127.0.0.1:18084`。如需修改前端端口，请在 `docker.env` 中调整 `WEB_PORT`。

默认允许在设置页配置 API Key，便于 demo 试用：

```dotenv
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
```

生产环境如需锁定服务端配置，可改为 `false`。
