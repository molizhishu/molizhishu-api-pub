# 部署说明

## Docker Compose

复制环境变量模板：

```bash
cp docker.env.example docker.env
```

至少修改：

```dotenv
APP_PORT=18080
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

- Docker Compose v2：`docker compose up -d --build`
- Docker Compose v1：`docker-compose up -d --build`

如果你的 Docker Compose v2 支持自动读取当前目录 `.env`，也可以自行复制配置后直接运行 Compose；推荐使用脚本，避免版本差异。

访问：

```text
http://127.0.0.1:18080
```

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
(cd ../frontend && npm run dev)
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
