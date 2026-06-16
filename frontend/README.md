# 公用前端管理端

根目录 `frontend/` 是所有语言后端 demo 共用的 React + Vite 管理端。各语言目录的 Docker Compose 会自动构建并启动这个前端；本目录单独启动主要用于本地开发和逐个后端测试。

## 开发启动

先启动任意一个后端 demo，再把前端代理到该后端 API：

```bash
cd frontend
npm install
VITE_API_TARGET=http://127.0.0.1:18080 npm run dev -- --host 127.0.0.1
```

访问：

```text
http://127.0.0.1:5173
```

`VITE_API_TARGET` 是 Vite 开发服务器的代理目标。前端代码仍然请求 `/api/*` 和 `/webhooks/*`，由 Vite 代理到对应后端。

## 后端端口

| 后端 demo | API 地址 |
| :--- | :--- |
| PHP | `http://127.0.0.1:18080` |
| Java | `http://127.0.0.1:18081` |
| Go | `http://127.0.0.1:18082` |
| Python | `http://127.0.0.1:18083` |
| ASP.NET Core | `http://127.0.0.1:18084` |
| Rust | `http://127.0.0.1:18085` |
| React Node API | `http://127.0.0.1:18086` |
| Vue Node API | `http://127.0.0.1:18087` |

例如测试 Vue Node API：

```bash
cd frontend
VITE_API_TARGET=http://127.0.0.1:18087 npm run dev -- --host 127.0.0.1
```

## Docker 一键部署

进入任意语言目录启动 Docker Compose，会同时拉起前端、API、数据库和必要的后台同步进程：

```bash
cd python
cp docker.env.example docker.env
sh scripts/docker-up.sh
```

默认访问：

```text
前端：http://127.0.0.1:18000
API：http://127.0.0.1:18083
```

各语言的 `web-build` 服务负责构建 `frontend/`，`web` 服务使用 Nginx 暴露前端并把 `/api/`、`/webhooks/` 反向代理到当前语言 API。

批量测试时可以在每个语言目录的 `docker.env` 中指定不同 `WEB_PORT`，例如 PHP 使用 `18000`、Java 使用 `18001`、Go 使用 `18002`、Python 使用 `18003`。API 端口由对应语言目录的默认配置控制。

如果修改了前端代码，需要重新启动或重建对应语言的 Docker Compose，前端容器才会拿到新的构建产物。

## 后端契约

公共前端要求所有语言后端保持一致的本地 API 行为：

- 登录接口使用 `POST /api/auth/login`，登录后前端会携带 `Authorization: Bearer <token>` 请求 `/api/**`。
- 任务列表和详情中的 `prompts_json`、`platforms_json`、`region_code_json` 必须是 JSON 字符串，前端会在浏览器侧解析后展示提示词、平台、模式和区域。
- 任务状态只使用模力指数 API 的固定状态值：`pending`、`processing`、`completed`、`partial_completed`、`failed`、`stopped`，前端统一渲染为中文。
- 控制台“今日概览”统计的是子任务数，不是主任务条数；右上角日期选择会作为查询时间范围传给后端。
- 子任务可能部分完成，详情页会展示已入库子任务，不能依赖主任务全部完成后才显示结果。

完整规则见 [../docs/implementation-contract.md](../docs/implementation-contract.md)。如果改了任意 API 字段、统计口径、同步逻辑或数据库字段，需要同步检查所有语言后端。

## 独立静态部署

如果不使用仓库内置 Docker 前端容器，也可以独立构建并部署静态文件：

```bash
cd frontend
npm install
npm run build
```

构建产物在 `frontend/dist`。独立部署时需要在 Nginx、网关或平台反向代理中把 `/api/` 和 `/webhooks/` 转发到所选后端 API。最小反向代理规则：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:18080;
}

location /webhooks/ {
    proxy_pass http://127.0.0.1:18080;
}
```

把 `18080` 替换成实际后端端口即可。

## 默认账号

```text
账号：admin
密码：molizhishu
```

生产部署后请尽快修改默认管理员密码。
