---
sidebar_position: 1
---

# 快速开始

欢迎使用 **模力指数监控 API** — 统一接口，覆盖主流 AI 大模型平台的监控与数据采集。

:::tip 为什么选择模力指数？
- **统一接口**：一套 API 对接 10+ 主流 AI 平台，无需逐一适配
- **实时监控**：异步任务引擎 + 回调通知，秒级感知平台响应变化
- **灵活配置**：按平台、模式、区域自由组合，精准覆盖业务场景
:::

## 核心能力

| 能力 | 说明                                                 |
|------|----------------------------------------------------|
| 🚀 **多平台支持** | DeepSeek、DeepSeek 移动端、豆包、豆包移动版、元宝、Kimi、通义千问、夸克、百度 AI+、文心一言、微博智搜 |
| 🔍 **多监控模式** | 基础模式、深度思考、联网搜索、深度+联网                               |
| 📊 **批量任务** | 单次提交最多 50 个 prompt × n 个平台配置（单个主任务限制最多生成 100个子任务）  |
| 📸 **截图采集** | 三种模式：不截图 / 全量截图 / 提及时截图                            |
| 🔄 **异步 + 回调** | 任务异步执行，支持状态轮询与 Webhook 回调                          |
| 🌐 **区域** | 指定区域，模拟不同地域访问                                      |

## 快速接入（3 步上手）

### 第 1 步：获取 Token

:::info
访问 [模力指数控制台](https://business.molizhishu.com) 注册账户，在「API 管理」中获取 Bearer Token。
:::

### 第 2 步：提交监控任务

```bash title="cURL 示例"
curl -X POST "https://business-api.molizhishu.com/api/business/monitor/task/batch/shared" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": ["人工智能的发展趋势"],
    "platforms": [
      {"platform": "deepseek", "mode": "search", "screenshot": 1}
    ]
  }'
```

**成功响应：**

```json
{
  "success": true,
  "code": 200,
  "message": "批量任务已提交",
  "data": {
    "taskId": "ec617e1996174c129a872680fa27078e",
    "totalTask": 1,
    "status": "pending",
    "pollUrl": "/api/business/monitor/task/status/ec617e1996174c129a872680fa27078e"
  }
}
```

### 第 3 步：获取结果

轮询 `pollUrl` 直到 `status` 变为 `completed`，然后获取完整结果：

```bash title="查询任务状态"
curl -X GET "https://business-api.molizhishu.com/api/business/monitor/task/status/{taskId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

```bash title="获取详细结果"
curl -X GET "https://business-api.molizhishu.com/api/business/monitor/task/result/{taskId}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 支持的 AI 平台

| platform 标识 | 平台名称 | 核心特点 |
|---------------|---------|------|
| <img src="/images/svg/deepseek-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`deepseek` | DeepSeek | 领先的国产自研大模型，深度思考能力出众 |
| <img src="/images/svg/doubao-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`doubao` | 豆包 | 字节跳动旗下的智能 AI 助手，响应极速 |
| <img src="/images/svg/yuanbao-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`yuanbao` | 元宝 | 腾讯出品的 AI 助手，连接微信生态 |
| <img src="/images/svg/kimi-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`kimi` | Kimi | 月之暗面出品，支持超长文本处理 |
| <img src="/images/svg/qwen-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`qianwen` | 通义千问 | 阿里巴巴自研大模型，综合能力全面 |
| <img src="/images/svg/quark-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`quark` | 夸克 | 夸克浏览器内置 AI，主打搜索与学习 |
| <img src="/images/svg/baidu-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`baiduai` | 百度 AI+ | 百度推出的 AI 增强搜索 |
| <img src="/images/svg/weibo-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`weibo_zhisou` | 微博智搜 | 微博推出的实时社交资讯 AI 搜索 |
| <img src="/images/svg/wenxin-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`wenxinyiyan` | 文心一言 | 百度旗下大语言模型，深度整合百度生态 |
| <img src="/images/svg/doubao-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`doubao_mobile` | 豆包移动版 | 字节跳动豆包移动端版本 |
| <img src="/images/svg/deepseek-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`deepseek_mobile` | DeepSeek 移动端 | DeepSeek 移动端版本 |

:::note 持续接入中
更多 AI 平台正在对接中，敬请期待。
:::

## 监控模式

| 模式值 | 名称 | 适用场景                            |
|--------|------|---------------------------------|
| `standard` | 基础/极速模式 | 快速获取 AI 基础回答                    |
| `reasoning` | 深度思考 | 需要 AI 深度推理的复杂问题                 |
| `search` | 联网搜索 | 需要 AI 结合实时网络信息回答（大部分模型默认开启联网搜索） |
| `reasoning_search` | 深度+联网 | 同时启用深度思考和联网搜索                   |

## 常见错误码

| 错误码 | 含义 | 处理建议 |
|--------|------|----------|
| `400001` | 参数校验失败 | 检查必填字段和格式 |
| `400002` | 超出数量上限 | prompts/platforms 最多各 50 个 |
| `401001` | Token 无效或过期 | 重新获取 Token |
| `500001` | 服务内部错误 | 稍后重试或联系技术支持 |

## 使用建议

### 提交策略

系统支持单次任务同时包含多个提示词与多个平台，但为保障整体完成率，**建议以「1 个提示词 × 1 个平台」为单位提交任务**，避免大批量提交时因个别子任务异常拖慢整体进度。

### 自动重试

任务执行失败后系统会自动重试，**每次重试间隔约 5 分钟，最多重试 10 次**，无需手动干预。

### 结果获取

支持两种获取方式，可按需混用：

| 方式 | 说明 | 推荐度 |
|------|------|--------|
| **Callback 回调** | 任务完成后系统主动推送，时效性更好 | ⭐ 推荐 |
| **主动轮询** | 定时调用状态/结果接口 | 可选 |

Callback 具备自动重试机制，失败后最多重试 **7 次**，重试间隔依次为：`15s → 1min → 5min → 15min → 1h → 4h → 12h`。

详细配置见 [Callback 回调](./api/callback-config)。

### 质量监控与自动重跑

我们会持续监控各平台的答案质量（包括信源缺失、深度思考缺失比例等）。当监控到某平台当日数据指标异常时，系统将**自动重跑缺失部分的任务**，并通过 Callback 推送最新答案（仅限已配置回调地址的任务），全力保障当日任务高质量、100% 完成。

### 排队与支持

平台高峰期压力较大时，任务可能短暂进入排队状态。如需调整任务优先级，或遇到任何问题，欢迎随时联系我们——各时段均有同事在线监控，会第一时间响应。

## 深入探索

- 📖 查看完整 [API 接口文档](./api/overview) — 所有接口的请求/响应详细说明
- 🌐 访问 [控制台](https://business.molizhishu.com) — 管理任务、查看统计
- 💬 遇到问题？欢迎联系技术支持团队
