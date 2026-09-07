---
id: overview
title: 概述
sidebar_position: 1
---

# 模力指数监控 API 概述

本文档描述了模力指数监控任务相关的后端接口，用于批量提交监控任务、查询任务状态和获取监控结果。支持多平台、多模式的AI监控能力。

## API 在线文档

https://s.apifox.cn/2b1bf8c3-cb3a-43e8-ab22-82a19706d5f8?pwd=molizhishu

## 接口信息

- **Base URL**: `https://business-api.molizhishu.com/api/business/monitor`
- **认证方式**: Bearer Token
- **请求头**: `Authorization: Bearer <token>`
- **响应格式**: JSON

## 监控模式说明

建议使用search和reasoning_search（**这两种模式下，大模型会返回信源**）；standard和reasoning 模式下，**大模型不会返回信源**。

| Mode 值 | 业务含义 | 国内模型费用 | 海外模型费用 | 描述 |
|---------|----------|--------------|--------------|------|
| `standard` | 基础/极速模式 | 仅收取基础费用 | 标准定价 **0.6 元/次**，折扣结算价 **0.24 元/次** | **大模型不返回信源** |
| `reasoning` | 深度思考模式 | **基础费用 + 0.09 元** | 标准定价 **0.6 元/次**，折扣结算价 **0.24 元/次** | **大模型不返回信源** |
| `search` | 联网搜索模式 | 仅收取基础费用 | 标准定价 **0.6 元/次**，折扣结算价 **0.24 元/次** | 大模型会返回信源 |
| `reasoning_search` | 深度+联网模式 | **基础费用 + 0.09 元** | 标准定价 **0.6 元/次**，折扣结算价 **0.24 元/次** | 大模型会返回信源 |

### 国内模型费用说明

按子任务计费：基础费用为 **0.09 元/次**；使用 `reasoning` 或 `reasoning_search` 模式时，额外加收 **0.09 元/次**；开启截图时额外加收 **0.09 元/次**。

例如：提交 1 个 prompt 到 1 个平台，使用 `reasoning_search` 模式并开启截图，则费用为 **0.09（基础费用）+ 0.09（深度思考）+ 0.09（截图）= 0.27 元**。

### 海外模型费用说明

因海外模型综合成本较高，新增模型的标准定价高于现有国内模型，详见下表：

- **联网搜索 / 深度思考 / 联网搜索+深度思考**：标准定价 **0.6 元/次**；折扣结算价 **0.24 元/次**。
- **带截图**：标准定价 **0.8 元/次**；折扣结算价 **0.32 元/次**。

以上折扣结算价为最终计费标准，如有疑问，欢迎随时与我们沟通。

## 支持的 AI 平台列表

| platform | 平台名称 | 平台描述 |
| -------- | -------- | -------- |
| <img src="./images/svg/deepseek-color.svg" width="18" height="18" align="middle" />&nbsp;`deepseek` | DeepSeek | 领先的国产自研大模型，性能强劲。 |
| <img src="./images/svg/doubao-color.svg" width="18" height="18" align="middle" />&nbsp;`doubao` | 豆包 | 字节跳动旗下的智能 AI 助手。 |
| <img src="./images/svg/yuanbao-color.svg" width="18" height="18" align="middle" />&nbsp;`yuanbao` | 元宝 | 腾讯出品的 AI 助手，连接微信生态。 |
| <img src="./images/svg/kimi-color.svg" width="18" height="18" align="middle" />&nbsp;`kimi` | Kimi | 月之暗面出品，支持长文本处理。 |
| <img src="./images/svg/qwen-color.svg" width="18" height="18" align="middle" />&nbsp;`qianwen` | 通义千问 | 阿里巴巴自研大模型，功能全面。 |
| <img src="./images/svg/quark-color.svg" width="18" height="18" align="middle" />&nbsp;`quark` | 夸克 | 夸克浏览器内置 AI，主打搜索与学习。 |
| <img src="./images/svg/baidu-color.svg" width="18" height="18" align="middle" />&nbsp;`baiduai` | 百度文心 | 百度智能搜索，不支持深度思考。 |
| <img src="./images/svg/weibo-color.svg" width="18" height="18" align="middle" />&nbsp;`weibo_zhisou` | 微博智搜 | 微博推出的 AI 搜索。 |
| <img src="./images/svg/antafu-color.svg" width="18" height="18" align="middle" />&nbsp;`antafu` | 蚂蚁阿福 | 蚂蚁集团旗下 AI 健康助手。 |
| <img src="./images/svg/douyinai-color.svg" width="18" height="18" align="middle" />&nbsp;`douyinai` | 抖音AI | 抖音AI搜索。 |
| <img src="./images/svg/openai-color.svg" width="18" height="18" align="middle" />&nbsp;`chatgpt` | ChatGPT | OpenAI 聊天模型。 |
| <img src="./images/svg/doubao-color.svg" width="18" height="18" align="middle" />&nbsp;`doubao_mobile` | 豆包移动版 | 豆包移动端正在升级维护，暂时无法提交任务。 |
| <img src="./images/svg/deepseek-color.svg" width="18" height="18" align="middle" />&nbsp;`deepseek_mobile` | DeepSeek 移动端 | DeepSeek 移动端版本。 |
| <img src="./images/svg/qwen-color.svg" width="18" height="18" align="middle" />&nbsp;`qianwen_mobile` | 通义千问移动端 | 通义千问移动端版本。 |
| <img src="./images/svg/yuanbao-color.svg" width="18" height="18" align="middle" />&nbsp;`yuanbao_mobile` | 元宝移动端 | 元宝的移动端版本。 |
| <img src="./images/svg/baidu-color.svg" width="18" height="18" align="middle" />&nbsp;`baidu_mobile` | 百度文心移动端 | 百度文心移动端，不支持深度思考。 |

## 商品/视频/搜索词/分享链接支持情况

### Web 端

各 AI 平台的视频、商品、搜索词和分享链接支持情况如下。分享链接仅在开启截图时返回：

| 平台 | 视频 | 商品 | 搜索词 | 分享链接 |
| --- | --- | --- | --- | --- |
| 豆包 | ✅ | ✅ | ✅ | ✅ |
| 百度文心 | ✅ | ✅ | ❌ | ✅ |
| 元宝 | ✅ | ✅ | ❌ | ✅ |
| 夸克 | ✅ | ✅ | ✅ | ❌ |
| 微博智搜 | ✅ | ❌ | ❌ | ❌ |
| 抖音AI | ✅ | ❌ | ✅ | ❌ |
| 千问 | ✅ | ❌ | ✅ | ✅ |
| Deepseek | ❌ | ❌ | ✅ | ✅ |
| Kimi | ❌ | ❌ | ✅ | ✅ |
| 蚂蚁阿福 | ❌ | ❌ | ✅ | ✅ |

### 移动端

| 平台 | 视频 | 商品 | 搜索词 | 分享链接 |
| --- | --- | --- | --- | --- |
| 豆包移动版 | ❌ | ✅ | ❌ | ❌ |
| 通义千问移动端 | ❌ | ✅ | ❌ | ❌ |
| 元宝移动端 | ✅ | ✅ | ❌ | ❌ |
| 百度文心移动端 | ✅ | ✅ | ❌ | ❌ |
| DeepSeek 移动端 | ❌ | ❌ | ❌ | ❌ |
