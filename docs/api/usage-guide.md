---
id: usage-guide
title: 使用指南
sidebar_position: 8
---

# 使用指南

## 完整工作流程

```bash
# 步骤1: 提交批量监控任务
curl -X POST "https://business-api.molizhishu.com/api/business/monitor/task/batch/shared" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": ["人工智能发展趋势", "机器学习应用"],
    "platforms": [
      {"platform": "deepseek", "mode": "search", "screenshot": 1}
    ]
  }'

# 步骤2: 查询任务状态
curl -X GET "https://business-api.molizhishu.com/api/business/monitor/task/status/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 步骤3: 停止未结束的任务（可选）
curl -X PUT "https://business-api.molizhishu.com/api/business/monitor/task/550e8400-e29b-41d4-a716-446655440000/stop" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 步骤4: 获取完整结果
curl -X GET "https://business-api.molizhishu.com/api/business/monitor/task/result/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 步骤5: 获取单个子任务结果
curl -X GET "https://business-api.molizhishu.com/api/business/monitor/task/result/550e8400-e29b-41d4-a716-446655440000/660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 步骤6: 获取任务列表
curl -X GET "https://business-api.molizhishu.com/api/business/monitor/task/list?page=1&size=10&status=completed" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 步骤7: 配置默认回调地址（可选）
curl -X PUT "https://business-api.molizhishu.com/api/business/monitor/task/callback-url" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"callbackUrl":"https://your-domain.com/callback"}'
```

## 注意事项

### 认证与权限
- 所有接口都需要有效的认证 Token
- Token 通过 `Authorization: Bearer <token>` 头传递
- Token 过期后需要重新获取

### 任务执行流程
1. 任务提交后初始状态为 `pending`，系统异步处理
2. 建议每 5-10 秒轮询一次状态接口，避免过于频繁的请求
3. 当 `status` 为 `completed`、`partial_completed`、`failed` 或 `stopped` 时，可以获取最终结果

### 数据保留
- 任务结果数据会保留一定时间
- 建议及时获取和备份重要数据

## Callback 回调（可选）

系统支持在任务完成后主动推送结果，无需轮询。

- **全局 callback**：通过接口预先设置账号级别的默认地址
- **任务级 callback**：提交任务时通过 `callbackUrl` 字段临时指定，仅对该次任务生效
- 两者均未配置时，任务完成后不触发推送

完整的触发条件、请求格式、重试策略及自定义回调说明，详见 [Callback 回调](./callback-config)。
