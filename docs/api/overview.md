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

| Mode 值 | 业务含义 |
|---------|----------|
| `standard` | 基础/极速模式 |
| `reasoning` | 深度思考模式 |
| `search` | 联网搜索模式 |
| `reasoning_search` | 深度+联网模式 |

## 支持的 AI 平台列表

| platform | 平台名称 | 平台描述 |
| -------- | -------- | -------- |
| <img src="/images/svg/deepseek-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`deepseek` | DeepSeek | 领先的国产自研大模型，性能强劲。 |
| <img src="/images/svg/doubao-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`doubao` | 豆包 | 字节跳动旗下的智能 AI 助手。 |
| <img src="/images/svg/yuanbao-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`yuanbao` | 元宝 | 腾讯出品的 AI 助手，连接微信生态。 |
| <img src="/images/svg/kimi-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`kimi` | Kimi | 月之暗面出品，支持长文本处理。 |
| <img src="/images/svg/qwen-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`qianwen` | 通义千问 | 阿里巴巴自研大模型，功能全面。 |
| <img src="/images/svg/quark-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`quark` | 夸克 | 夸克浏览器内置 AI，主打搜索与学习。 |
| <img src="/images/svg/baidu-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`baiduai` | 百度 AI+ | 百度推出的 AI 搜索。 |
| <img src="/images/svg/weibo-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`weibo_zhisou` | 微博智搜 | 微博推出的 AI 搜索。 |
| <img src="/images/svg/wenxin-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`wenxinyiyan` | 文心一言 | 百度旗下大语言模型，深度整合百度生态。 |
| <img src="/images/svg/doubao-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`doubao_mobile` | 豆包移动版 | 字节跳动豆包移动端版本。 |
| <img src="/images/svg/deepseek-color.svg" width="18" height="18" style={{verticalAlign:'middle',marginRight:'6px'}} />`deepseek_mobile` | DeepSeek 移动端 | DeepSeek 移动端版本。 |
