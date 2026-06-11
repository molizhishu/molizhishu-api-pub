# 贡献指南

感谢你参与改进模力指数 API 对接项目。这个项目面向二次开发和私有化部署，贡献时请优先保持简单、清晰、可部署。

## 开发环境

后端：

```bash
composer install
cp .env.example .env
php think run -p 8000
```

前端：

```bash
(cd ../frontend && npm install)
(cd ../frontend && npm run dev)
```

提交前建议至少运行：

```bash
composer check
(cd ../frontend && npm run build)
```

## 代码约定

- PHP 使用严格类型声明：`declare(strict_types=1);`
- 控制器只处理入参、响应和异常映射，远端 API、落库、同步逻辑放在 service/repository 中。
- 前端公共接口统一放在 `../frontend/src/api.ts`。
- UI 保持后台管理系统风格：信息密度适中、表格清晰、颜色克制。
- 不要把真实 API Key、数据库密码、日志、构建产物提交到仓库。

## 分支和提交

建议提交信息使用清晰的动词开头，例如：

```text
feat: add task stop action
fix: sync stopped task result after remote stop
docs: improve docker deployment guide
```

## 安全提醒

如果你发现安全漏洞，请不要直接公开 issue，先参考 [SECURITY.md](SECURITY.md)。
