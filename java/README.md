# Spring Boot + MyBatis API 对接 Demo

基于 Java 17、Spring Boot 3、MyBatis、MySQL 的模力指数监控 API 对接示例。

## 快速开始

```bash
cd java
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS molizhishu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p molizhishu < database/schema.sql
export MOLIZHISHU_TOKEN=你的 API Key
./mvnw spring-boot:run
```

如果本地没有 `mvnw`，可直接使用已安装 Maven：

```bash
mvn spring-boot:run
```

## 环境变量

| 变量 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `SERVER_PORT` | 服务端口 | `18081` |
| `DATABASE_URL` | JDBC 地址 | `jdbc:mysql://127.0.0.1:3306/molizhishu?...` |
| `DATABASE_USERNAME` | 数据库账号 | `root` |
| `DATABASE_PASSWORD` | 数据库密码 | 空 |
| `MOLIZHISHU_TOKEN` | 服务端 API Key | 空 |
| `MOLIZHISHU_CALLBACK_URL` | 默认任务级 Callback | 空 |
| `MOLIZHISHU_SYNC_ENABLED` | 是否启动进程内后台补偿同步 | `true` |
| `MOLIZHISHU_SYNC_INTERVAL_SECONDS` | 后台同步间隔秒数 | `60` |
| `MOLIZHISHU_SYNC_LIMIT` | 每轮最多同步任务数 | `20` |

## 本地接口

接口语义与 PHP/Go/Python demo 保持一致：

- `POST /api/tasks`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/tasks`
- `GET /api/tasks/{taskId}`
- `POST /api/tasks/{taskId}/sync`
- `PUT /api/tasks/{taskId}/stop`
- `POST /webhooks/molizhishu`
- `GET /api/callback-url`
- `PUT /api/callback-url`
- `GET /api/cities`

## 目录结构

- `controller/`：Spring MVC HTTP 入口，负责参数读取、响应状态和异常映射。
- `client/`：模力指数远端 API Client，统一处理鉴权、响应 envelope、业务错误和日志。
- `service/`：任务持久化、同步编排和管理端鉴权业务。
- `mapper/`：MyBatis 注解式 Mapper，访问 `geo_` 前缀表。
- `schedule/`：Spring `@Scheduled` 后台补偿同步触发器，只负责定时触发。
- `config/`：配置属性、拦截器和 Web 配置。
- `support/`：响应 envelope、API Key 脱敏和请求校验等无状态辅助类。

## 注意事项

- `MOLIZHISHU_TOKEN` 只在服务端配置，不能进入前端代码。
- MyBatis 示例为注解式 Mapper，便于阅读；落地到大型项目时可迁移到 XML Mapper。
- Callback 使用 `task_id + payload_hash` 做幂等，重复推送不会重复写入子任务。
- Java 服务通过 `schedule.TaskSyncSchedule` 使用 Spring `@Scheduled` 定时触发后台同步；`service.TaskSyncService` 只负责同步业务逻辑。定时任务会拉取未完成或结果未完整入库的任务；只要状态接口出现已完成子任务，就会继续拉取结果接口。
- 除登录、健康检查和 Callback 外，`/api/**` 默认需要 `Authorization: Bearer <token>`，兼容根目录 `frontend/` 的登录流程。
- 默认管理员为 `admin / molizhishu`，初始化 SQL 会写入 `geo_admin_users` 表。生产部署后请修改默认密码。
- 任务列表和详情接口需要保持公共前端契约：`prompts_json`、`platforms_json`、`region_code_json` 返回 JSON 字符串；远端同步不能覆盖提交参数。

## 与公共前端保持一致

本 demo 复用根目录 `frontend/`，因此本地 API 字段和行为必须与其它语言保持一致。修改以下内容时需要同步检查所有语言：

- `/api/tasks` 和 `/api/tasks/{taskId}` 的响应字段名和字段类型。
- `prompts_json`、`platforms_json`、`region_code_json` 必须返回 JSON 字符串。
- 后台同步不能把提交参数覆盖成空数组。
- 控制台统计口径是子任务数，不是主任务条数。

完整契约见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。

## Docker

```bash
cp docker.env.example docker.env
sh scripts/docker-up.sh
```

默认 API 端口为 `18081`，数据库表使用 `geo_` 前缀。

Docker 默认使用 `TZ=Asia/Shanghai`，MySQL 使用 `MYSQL_TIME_ZONE=+08:00`，JDBC URL 使用 `serverTimezone=Asia/Shanghai`。本地 `DATETIME` 字段按东八区保存，远端毫秒级时间戳由公共前端按东八区显示。

Docker Compose 会同时启动公共前端、Java API 和 MySQL。默认访问：前端 `http://127.0.0.1:18000`，API `http://127.0.0.1:18081`。如需修改前端端口，请在 `docker.env` 中调整 `WEB_PORT`。

如果旧版本已经初始化过数据库，Compose 不会自动重跑建表脚本。测试环境可删除旧 volume 后重建；生产环境请先备份并迁移数据。

默认允许在设置页配置 API Key，便于 demo 试用：

```dotenv
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
```

生产环境如需锁定服务端配置，可改为 `false`。
