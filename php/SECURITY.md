# 安全说明

## 支持范围

当前项目是模力指数监控 API 的开源对接示例，主要关注：

- API Key 服务端保存和脱敏展示
- 管理端登录鉴权
- Callback payload 大小限制和幂等处理
- 本地任务数据查询与补偿同步

## 敏感信息

请不要提交以下文件或内容：

- `.env`
- `docker.env`
- 数据库备份
- 运行日志
- 真实 API Key、Callback 私密地址、生产数据库密码

默认允许在页面配置 API Key。如需生产环境锁定配置，可显式关闭：

```dotenv
APP_DEBUG=false
MOLIZHISHU_ALLOW_API_KEY_UPDATE=false
```

## 报告漏洞

如果你发现漏洞，请通过私有渠道联系项目维护者，并附上：

- 影响版本或提交
- 复现步骤
- 影响范围
- 建议修复方案

请避免在公开 issue 中暴露 API Key、数据库内容、服务器地址或用户数据。
