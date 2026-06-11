# 模力指数 API 接入 Demo 工作区

这是一个面向多语言后端 demo 的工作区。所有后端实现各自放在独立目录中，前端管理端放在根目录 `frontend/`，供不同后端 demo 复用。

## 目录结构

```text
.
├── frontend/   # 公用 React + Vite 管理端
├── php/        # PHP 8 + ThinkPHP API 接入 demo
└── docs/       # 公用提示词和跨语言资料
```

## 当前 demo

- [PHP 8 + ThinkPHP demo](php/README.md)
- 公用前端：[frontend](frontend)
- 公用提示词：[docs/vibecoding-polling-prompt.md](docs/vibecoding-polling-prompt.md)

## 约定

- 每个后端 demo 自己维护 README、Docker Compose、部署文档、安全说明和测试配置。
- 根目录只放跨语言共享内容和公用前端。
- 后续可以并列新增 `golang/`、`java/` 等目录。

