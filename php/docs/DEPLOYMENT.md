# 部署说明

## Docker Compose

复制环境变量模板：

```bash
cp docker.env.example docker.env
```

至少修改：

```dotenv
WEB_PORT=18000
API_PORT=18080
APP_DEBUG=false
MOLIZHISHU_TOKEN=你的模力指数 API Key
MOLIZHISHU_ALLOW_API_KEY_UPDATE=true
MYSQL_ROOT_PASSWORD=安全的 root 密码
MYSQL_PASSWORD=安全的应用数据库密码
```

启动：

```bash
sh scripts/docker-up.sh
```

脚本会读取 `docker.env` 并导出环境变量，然后自动选择可用的 Compose 命令：

- Docker Compose v2：`docker compose up -d`
- Docker Compose v1：`docker-compose up -d`

如果你的 Docker Compose v2 支持自动读取当前目录 `.env`，也可以自行复制配置后直接运行 Compose；推荐使用脚本，避免版本差异。

常见问题：

- `scripts/docker-up.sh: .: docker.env: not found`：请更新到包含脚本修复的版本；旧版本可临时使用 `docker compose up -d`。
- Composer 下载依赖出现 GitHub `504`：通常是网络波动，重新执行 `sh scripts/docker-up.sh` 即可。如需切回官方源，请在 `docker.env` 中设置：

默认 Composer 源为：

```dotenv
COMPOSER_REPO_PACKAGIST=https://mirrors.aliyun.com/composer/
```

访问：

```text
前端：http://127.0.0.1:18000
API：http://127.0.0.1:18080
```

Docker 默认服务规划：

| 服务 | 镜像 | 容器 | 端口 |
| :--- | :--- | :--- | :--- |
| `web-build` | `node:20-alpine` | `molizhishu-api-pub-php-web-build` | 不暴露端口 |
| `web` | `nginx:1.27-alpine` | `molizhishu-api-pub-php-web` | `${WEB_PORT:-18000}:18000` |
| `php` | `php:8.2-apache` | `molizhishu-api-pub-php` | `${API_PORT:-18080}:18080` |
| `worker` | `php:8.2-cli` | `molizhishu-api-pub-worker` | 不暴露端口 |
| `db` | `mysql:8.4` | `molizhishu-api-pub-db` | 不暴露端口 |

`web-build` 负责构建根目录公共前端，`web` 负责静态访问并把 `/api/*` 和 `/webhooks/*` 反向代理到 PHP API 容器。`worker` 只运行补偿同步循环，不是 API 服务，因此不会映射 Web 端口。

`worker` 独立成容器的原因是职责隔离：`php` 容器处理 HTTP API，`worker` 容器处理后台同步循环。拆开后日志、重启策略和资源扩展都更清晰；如果把两者放进同一个容器，就需要额外进程管理器同时维护 Apache 和同步循环，部署复杂度反而更高。

默认账号：

```text
admin / molizhishu
```

首次部署后建议修改默认管理员密码。

## 本地部署

安装依赖：

```bash
composer install
(cd ../frontend && npm install)
```

初始化环境：

```bash
cp .env.example .env
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

启动前端：

```bash
(cd ../frontend && VITE_API_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1)
```

## 后台补偿同步

常驻循环：

```bash
php think molizhishu:sync-loop --interval 60 --limit 20
```

单次同步：

```bash
php think molizhishu:sync-pending --limit 20
```

Docker Compose 中的 `worker` 服务会自动运行补偿同步循环。
