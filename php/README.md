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
| 部署 | Docker Compose、Apache、PHP-FPM/Apache 镜像 |

## 目录结构

```text
.
php/
├── app/                 # ThinkPHP 应用代码
├── config/              # 后端配置
├── database/            # MySQL DDL
├── docker/              # Apache 和容器入口脚本
├── docs/                # PHP demo 文档
├── public/              # Web 入口
├── route/               # 路由
├── tests/               # 单元测试
├── docker-compose.yml
└── Dockerfile
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
DATABASE_PASSWORD=
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
(cd ../frontend && npm run dev)
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
MOLIZHISHU_TOKEN=你的模力指数 API Key
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
MYSQL_ROOT_PASSWORD=安全的 root 密码
MYSQL_PASSWORD=安全的应用数据库密码
```

启动：

```bash
sh scripts/docker-up.sh
```

如果你的 Docker 环境支持 Compose v2，也可以直接运行：

```bash
docker compose up -d --build
```

`scripts/docker-up.sh` 会自动读取 `docker.env`，并兼容不支持 `docker compose --env-file` 的老版本 Docker。

默认访问：

```text
http://127.0.0.1:18080
```

更多部署说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 关键配置

| 环境变量 | 说明 | 默认值 |
| :--- | :--- | :--- |
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
| `PUT` | `/api/settings/api-key` | 更新 API Key，默认生产禁用 |

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
