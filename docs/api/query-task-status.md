---
id: query-task-status
title: 查询任务状态
sidebar_position: 3
---

# 查询任务状态

**接口地址:** `GET /task/status/{taskId}`

**接口描述:** 查询批量任务的执行状态和子任务进度

**需要认证:** 是

## 请求参数

**路径参数:**

| 参数名 | 类型 | 位置 | 必需 | 描述 |
|--------|------|------|------|------|
| taskId | String | Path | 是 | 批量任务ID（UUID格式） |

## 响应结果

**成功响应:**
```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "taskId": "5a85cdd0ed9249cfb69daaeca2b91a09",
        "status": "completed",
        "message": "任务进度: 2/2 已完成, 0 失败",
        "totalItems": 2,
        "completedItems": 2,
        "failedItems": 0,
        "createdAt": 1781080844000,
        "completedAt": 1781082052000,
        "subTaskList": [
            {
                "subTaskId": "1037392",
                "prompt": "目前市场上销量较高的手机品牌有哪些",
                "platform": "doubao",
                "mode": "reasoning_search",
                "status": "completed",
                "monitorKeywords": "华为",
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
                ]
            } 
        ]
    }
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| taskId | String | 批量任务ID |
| status | String | 任务状态，详见下方状态说明 |
| message | String | 任务进度描述 |
| totalItems | Integer | 子任务总数 |
| completedItems | Integer | 已完成数量 |
| failedItems | Integer | 失败数量 |
| createdAt | Long | 创建时间戳（毫秒） |
| completedAt | Long | 完成时间戳（秒），未完成时为 `null` |
| subTaskList | Array | 子任务列表 |
| subTaskList[].subTaskId | String | 子任务ID |
| subTaskList[].prompt | String | 监控提示词 |
| subTaskList[].platform | String | AI平台 |
| subTaskList[].mode | String | 监控模式 |
| subTaskList[].status | String | 子任务状态，详见[获取子任务结果](./get-subtask-result) |
| subTaskList[].monitorKeywords | String | 监控关键词 |
| subTaskList[].monitorKeywordAliases | List&lt;String&gt; | 监控词别名列表 |
| subTaskList[].competitors | Array | 竞品词列表（含别名） |
| subTaskList[].competitors[].name | String | 竞品名称 |
| subTaskList[].competitors[].aliases | List&lt;String&gt; | 竞品别名列表 |

**任务状态值:**

| 状态值 | 描述 |
|------|------|
| pending | 任务已创建，等待开始执行 |
| processing | 任务执行中 |
| completed | 任务全部完成且无失败 |
| partial_completed | 任务部分完成，有成功也有失败 |
| failed | 任务全部失败 |
| stopped | 任务被人工停止，详见[停止监控任务](./stop-task) |

## 轮询建议

建议每 5-10 秒轮询一次状态接口，避免过于频繁的请求。当 `status` 为 `completed`、`partial_completed`、`failed` 或 `stopped` 时，可以获取最终结果。
