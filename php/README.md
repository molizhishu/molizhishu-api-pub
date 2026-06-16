# 模力指数 API 对接控制台

这是模力指数监控 API 的 **PHP 8 + ThinkPHP 8** 接入 demo，搭配根目录的公共 React + Vite 管理端使用。

> 适合用作模力指数 API 私有化接入、二次开发或快速部署示例。

## 功能特性

- 管理端登录鉴权
- 提交模力指数批量监控任务
- 平台、模式、区域、截图等任务参数配置
- 任务列表、任务详情、子任务结果展示
- Markdown 结果渲染、引用来源解析、原始 JSON 查看和复制
- 支持停止未完成任务
- Callback 接收、幂等落库和处理记录
- 后台补偿同步，适配没有公网 Callback 的部署场景
- 系统设置页配置 API Key 和全局 Callback
- 控制台统计：任务概览、模型分析、趋势图、近期任务
- Docker Compose 一键部署

## 技术栈

| 层级 | 技术 |
| :--- | :--- |
| 后端 | PHP 8、ThinkPHP 8、think-orm |
| 前端 | React、TypeScript、Vite、TanStack Query、Recharts |
| 数据库 | MySQL 8 |
| 部署 | Docker Compose、Apache、Nginx、官方语言运行时镜像 |

## 目录结构

```text
.
php/
├── app/
│   ├── command/         # 后台补偿同步 CLI 命令
│   ├── controller/      # HTTP Controller
│   ├── middleware/      # 管理端鉴权中间件
│   ├── service/         # 远端 Client、Repository、同步编排和鉴权服务
│   └── support/         # Callback/JSON payload 等轻量辅助
├── config/              # 后端配置
├── database/            # MySQL DDL
├── docker/              # Apache 和容器入口脚本
├── docs/                # PHP demo 文档
├── public/              # Web 入口
├── route/               # 路由
├── tests/               # 单元测试
└── docker-compose.yml
```

## 快速开始

### 1. PHP 后端

```bash
composer install
cp .env.example .env
```

编辑 `.env`：

```dotenv
APP_DEBUG=true
MOLIZHISHU_TOKEN=你的模力指数 API Key
MOLIZHISHU_CALLBACK_URL=
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true

DATABASE_HOST=127.0.0.1
DATABASE_NAME=molizhishu
DATABASE_USER=root
DATABASE_PASSWORD=your_mysql_password
DATABASE_PORT=3306
```

初始化数据库：

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS molizhishu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p molizhishu < database/schema.sql
```

启动后端：

```bash
php think run -p 8000
```

### 2. 前端

```bash
(cd ../frontend && npm install)
(cd ../frontend && VITE_API_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1)
```

访问：

```text
http://127.0.0.1:5173
```

默认管理员：

```text
账号：admin
密码：molizhishu
```

首次部署后建议尽快修改默认密码。

## Docker 部署

```bash
cp docker.env.example docker.env
```

编辑 `docker.env`，至少修改：

```dotenv
WEB_PORT=18000
API_PORT=18080
MOLIZHISHU_TOKEN=你的模力指数 API Key
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
MYSQL_ROOT_PASSWORD=安全的 root 密码
MYSQL_PASSWORD=安全的应用数据库密码
TZ=Asia/Shanghai
MYSQL_TIME_ZONE=+08:00
```

启动：

```bash
sh scripts/docker-up.sh
```

如果你的 Docker 环境支持 Compose v2，也可以直接运行：

```bash
docker compose up -d
```

`scripts/docker-up.sh` 会自动读取 `docker.env`，并兼容不支持 `docker compose --env-file` 的老版本 Docker。

当前部署方案不再维护 Dockerfile，Compose 会直接拉取官方镜像。首次启动时会在容器内安装 PHP 扩展和 Composer 依赖，因此第一次启动会比预构建镜像慢一些。

如果服务器安装依赖时遇到网络波动，可以直接重试 `sh scripts/docker-up.sh`；如需切换 Composer 镜像源，可在 `docker.env` 中修改：

默认 Composer 源为：

```dotenv
COMPOSER_REPO_PACKAGIST=https://mirrors.aliyun.com/composer/
```

默认访问：

```text
前端：http://127.0.0.1:18000
API：http://127.0.0.1:18080
```

Docker Compose 会同时启动前端容器、PHP API、后台同步 worker 和 MySQL。前端容器会构建根目录公共前端，并把 `/api/*`、`/webhooks/*` 反向代理到 PHP API。

Docker 默认镜像和容器命名：

| 服务 | 镜像 | 容器 | 端口 |
| :--- | :--- | :--- | :--- |
| 前端构建 | `node:20-alpine` | `molizhishu-api-pub-php-web-build` | 不暴露端口 |
| 前端 Web | `nginx:1.27-alpine` | `molizhishu-api-pub-php-web` | `${WEB_PORT:-18000}:18000` |
| PHP API | `php:8.2-apache` | `molizhishu-api-pub-php` | `${API_PORT:-18080}:18080` |
| 同步进程 | `php:8.2-cli` | `molizhishu-api-pub-worker` | 不暴露端口 |
| MySQL | `mysql:8.4` | `molizhishu-api-pub-db` | 不暴露端口 |

数据库表统一使用 `geo_` 前缀，例如 `geo_tasks`、`geo_subtasks`、`geo_callback_events`、`geo_admin_users`。

Docker 默认使用 `TZ=Asia/Shanghai`，MySQL 使用 `MYSQL_TIME_ZONE=+08:00`。本地 `DATETIME` 字段按东八区保存，避免任务创建时间和远端毫秒级执行时间显示相差 8 小时。

如果你已经用旧版本 Docker 启动过 MySQL，已有 volume 不会自动重新执行 `database/schema.sql`。测试环境可删除旧 volume 后重建；生产环境请先备份数据，再按业务需要迁移旧表到 `geo_` 前缀表。

容器职责说明：

- `molizhishu-api-pub-php-web-build`：负责用 Node 构建根目录公共前端，构建产物写入 Docker volume。
- `molizhishu-api-pub-php-web`：负责前端静态页面访问，并把 `/api/*`、`/webhooks/*` 反向代理到 PHP API，默认监听 `18000`。
- `molizhishu-api-pub-php`：负责 PHP API、Callback 接收和设置保存，默认监听 `18080`。
- `molizhishu-api-pub-worker`：负责后台补偿同步，把未完成或部分完成的远端任务定期拉回本地数据库。它不是 API 服务，不接收浏览器请求，因此不暴露端口。
- `molizhishu-api-pub-db`：MySQL 数据库，只在 Compose 内部网络中供 PHP API 和 worker 访问。

`worker` 没有合并进 `php` 容器，是为了保持一个容器只运行一种长期进程：API 容器专注 HTTP 请求，worker 容器专注后台同步。这样日志更清楚，任一进程异常重启时不会互相影响，也方便以后按需扩容 API 或单独控制同步进程数量。

更多部署说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 关键配置

| 环境变量 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `WEB_PORT` | 前端 Web 访问端口 | `18000` |
| `API_PORT` | PHP API 访问端口 | `18080` |
| `APP_DEBUG` | 是否开启调试 | `false` |
| `MOLIZHISHU_BASE_URL` | 模力指数监控 API 地址 | 官方业务 API |
| `MOLIZHISHU_CITY_URL` | 区域信息 API 地址 | 官方业务 API |
| `MOLIZHISHU_TOKEN` | 服务端 API Key | 空 |
| `MOLIZHISHU_CALLBACK_URL` | 全局 Callback URL | 空 |
| `MOLIZHISHU_ALLOW_API_KEY_UPDATE` | 是否允许页面修改 API Key | `true` |
| `MOLIZHISHU_TIMEOUT` | 远端请求超时时间，秒 | `30` |
| `MOLIZHISHU_CALLBACK_MAX_BYTES` | Callback 最大请求体字节数 | `5242880` |

API Key 只保存在服务端，不会进入前端构建产物。默认允许在页面配置；如需生产环境锁定配置，可显式关闭：

```dotenv
APP_DEBUG=false
MOLIZHISHU_ALLOW_API_KEY_UPDATE=false
```

## 本地接口

除登录和 Callback 外，其他 `/api` 接口都需要携带：

```http
Authorization: Bearer <token>
```

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | 管理员登录 |
| `GET` | `/api/auth/me` | 当前用户 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `POST` | `/api/tasks` | 创建监控任务 |
| `GET` | `/api/tasks` | 查询本地任务列表 |
| `GET` | `/api/tasks/{taskId}` | 查询本地任务详情 |
| `POST` | `/api/tasks/{taskId}/sync` | 手动补偿同步 |
| `PUT` | `/api/tasks/{taskId}/stop` | 停止未完成任务 |
| `POST` | `/webhooks/molizhishu` | 接收模力指数 Callback |
| `GET` | `/api/callback-url` | 查询全局 Callback |
| `PUT` | `/api/callback-url` | 设置或清空全局 Callback |
| `GET` | `/api/cities` | 获取可用区域 |
| `GET` | `/api/settings` | 查询系统设置 |
| `PUT` | `/api/settings/api-key` | 更新 API Key，默认允许，可通过环境变量关闭 |

## 与公共前端保持一致

本 demo 复用根目录 `frontend/`，因此本地 API 字段和行为必须与其它语言保持一致。修改以下内容时需要同步检查所有语言：

- `/api/tasks` 和 `/api/tasks/{taskId}` 的响应字段名和字段类型。
- `prompts_json`、`platforms_json`、`region_code_json` 必须返回 JSON 字符串。
- 后台同步不能把提交参数覆盖成空数组。
- 控制台统计口径是子任务数，不是主任务条数。

完整契约见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。

## 后台补偿同步

如果本地没有公网 Callback 地址，或需要定期修复未完成任务状态，可以启动补偿同步：

```bash
php think molizhishu:sync-loop --interval 60 --limit 20
```

单次同步：

```bash
php think molizhishu:sync-pending --limit 20
```

Docker Compose 的 `worker` 服务会自动运行补偿同步循环。

## 开发命令

后端：

```bash
composer check
```

前端：

```bash
(cd ../frontend && npm run typecheck)
(cd ../frontend && npm run build)
```

清理前端构建产物：

```bash
(cd ../frontend && npm run clean)
```

## 项目文档

- [架构说明](docs/ARCHITECTURE.md)
- [部署说明](docs/DEPLOYMENT.md)
- [贡献指南](CONTRIBUTING.md)
- [安全说明](SECURITY.md)

## 开源协议

本项目使用 [MIT License](LICENSE)。
