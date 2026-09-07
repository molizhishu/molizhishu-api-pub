---
id: get-task-list
title: 获取任务列表
sidebar_position: 6
---

# 获取任务列表

**接口地址:** `GET /task/list`

**接口描述:** 获取用户的任务列表，支持分页和状态过滤

**需要认证:** 是

## 请求参数

**Query 参数:**

| 参数名 | 类型 | 位置 | 必需 | 默认值 | 描述 |
|--------|------|------|------|--------|------|
| page | Integer | Query | 否 | 1 | 页码（从1开始） |
| size | Integer | Query | 否 | 10 | 每页数量（最大100） |
| status | String | Query | 否 | - | 任务状态过滤（可选：pending/processing/completed/partial_completed/failed/stopped） |

## 响应结果

**成功响应:**
```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "total": 6012,
        "page": 1,
        "size": 10,
        "tasks": [
            {
                "taskId": "05c517d143cd4f229786d294942b5a96",
                "consumerTaskId": "consumerTask202606300001",
                "prompts": [
                    "目前市场上销量较高的手机品牌有哪些"
                ],
                "platforms": [
                    {
                        "mode": "reasoning_search",
                        "platform": "doubao",
                        "screenshot": 1
                    }
                ],
                "monitorKeyword": "华为",
                "monitorKeywordAliases": [
                    "HUAWEI",
                    "华为手机"
                ],
                "competitors": [
                    {
                        "name": "小米",
                        "aliases": [
                            "Xiaomi",
                            "小米手机"
                        ]
                    },
                    {
                        "name": "苹果",
                        "aliases": [
                            "Apple",
                            "iPhone"
                        ]
                    }
                ],
                "status": "processing",
                "totalItems": 1,
                "completedItems": 0,
                "failedItems": 0,
                "createdAt": 1781091896000,
                "completedAt": null
            },
            {
                "taskId": "9aaa0a04211144c385d1186e76f85df3",
                "consumerTaskId": null,
                "prompts": [
                    "请帮我搜索最新款 iPhone型号，以及 iOS 版本",
                    "请帮我推荐一款智能手机"
                ],
                "platforms": [
                    {
                        "mode": "reasoning_search",
                        "platform": "doubao",
                        "screenshot": 0
                    },
                    {
                        "mode": "search",
                        "platform": "yuanbao",
                        "screenshot": 0
                    }
                ],
                "monitorKeyword": null,
                "monitorKeywordAliases": null,
                "competitors": null,
                "status": "completed",
                "totalItems": 4,
                "completedItems": 4,
                "failedItems": 0,
                "createdAt": 1781084231000,
                "completedAt": 1781085438000
            }
        ]
    }
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| total | Long | 任务总数 |
| page | Integer | 当前页码 |
| size | Integer | 每页数量 |
| tasks | Array | 任务列表 |
| tasks[].taskId | String | 任务ID |
| tasks[].consumerTaskId | String | 客户侧任务唯一标识，仅用于提交幂等；提交时未提供则为 `null` |
| tasks[].prompts | Array | 提示词列表 |
| tasks[].platforms | Array | 平台配置列表 |
| tasks[].monitorKeyword | String | 监控关键词 |
| tasks[].monitorKeywordAliases | Array | 监控关键词别名列表 |
| tasks[].competitors | Array | 竞品品牌列表 |
| tasks[].competitors[].name | String | 竞品名称 |
| tasks[].competitors[].aliases | Array | 竞品别名列表 |
| tasks[].status | String | 任务状态，详见[查询任务状态](./query-task-status) |
| tasks[].totalItems | Integer | 子任务总数 |
| tasks[].completedItems | Integer | 已完成数 |
| tasks[].failedItems | Integer | 失败数 |
| tasks[].createdAt | Long | 创建时间戳（毫秒） |
| tasks[].completedAt | Long | 完成时间戳（秒），未完成时为 `null` |
