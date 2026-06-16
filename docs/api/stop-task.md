---
id: stop-task
title: 停止监控任务
sidebar_position: 7
---

# 停止监控任务

**接口地址:** `PUT /task/{taskId}/stop`

**接口描述:** 停止一个尚未结束的批量监控任务。停止操作会终止未完成的子任务调度 **（已经完成的子任务结果仍然保留并可正常查询）**。

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
    "data": "任务已停止，影响子任务 2 个"
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| success | Boolean | 是否成功 |
| code | Integer | 状态码 |
| message | String | 提示信息 |
| data | String | 停止结果描述，包含本次被停止的未完成子任务数量 |

## 业务规则

- **主任务 `processing` 状态可停止**：当主任务处于 `processing` 时，仍可调用本接口停止任务；停止动作作用于子任务调度层。
- **仅拦截未分配（pending）子任务**：只有状态为 `pending`（未被节点分配/调度）的子任务会被立即停止；已进入 `assigned`（已分配，正在运行中）的子任务无法被中断，仍可能执行完成并计费。
- **已完成子任务不受影响**：状态为 `completed`、`success` 的子任务不受影响，其答案、信源、截图等结果继续保留并可查询。
- **已结束任务不可停止**：当任务整体状态已是 `completed`、`partial_completed`、`failed` 时，调用本接口将返回错误「任务已结束，不能停止」。
- **停止后状态冻结**：任务被停止后整体状态变为 `stopped`，后续查询状态/结果接口不会再自动推进主任务状态；已产出的子任务结果仍会继续展示。

## 停止后查询说明

停止任务后，再次调用[查询任务状态](./query-task-status)或[获取任务结果](./get-task-result)接口时：

- 任务整体 `status` 为 `stopped`
- `completedItems` / `failedItems` 按停止时刻已产出的可见结果重新统计
- 子任务列表中：
  - 已完成的子任务 `status` 保持为 `completed`
  - 被停止的未完成子任务 `status` 为 `stopped`

**查询状态响应示例:**
```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "taskId": "ec617e1996174c129a872680fa27078e",
        "status": "stopped",
        "message": "任务已停止",
        "totalItems": 4,
        "completedItems": 2,
        "failedItems": 0,
        "createdAt": 1769757913000,
        "completedAt": null,
        "subTaskList": [
            {
                "subTaskId": "4124831",
                "prompt": "请帮我搜索最新款 iPhone型号，以及 iOS 版本",
                "platform": "doubao",
                "mode": "reasoning_search",
                "status": "completed"
            },
            {
                "subTaskId": "4124832",
                "prompt": "请帮我搜索最新款 iPhone型号，以及 iOS 版本",
                "platform": "yuanbao",
                "mode": "search",
                "status": "completed"
            },
            {
                "subTaskId": "4124833",
                "prompt": "请帮我推荐一款智能手机",
                "platform": "doubao",
                "mode": "reasoning_search",
                "status": "stopped"
            },
            {
                "subTaskId": "4124834",
                "prompt": "请帮我推荐一款智能手机",
                "platform": "yuanbao",
                "mode": "search",
                "status": "stopped"
            }
        ]
    }
}
```

## 失败响应示例

**任务不存在:**
```json
{
    "success": false,
    "code": 404,
    "message": "任务不存在"
}
```

**无权操作:**
```json
{
    "success": false,
    "code": 403,
    "message": "无权操作该任务"
}
```

**任务已结束:**
```json
{
    "success": false,
    "code": 500,
    "message": "任务已结束，不能停止"
}
```

## 注意事项

- **请区分主任务与子任务状态**：主任务 `processing` 表示任务整体执行中，此时可以调用停止接口；子任务 `assigned` 表示已分配并运行中，这类子任务无法被立即中断。
- **停止的实际拦截范围**：只有 `pending`（未分配）、`failed`（执行失败）的子任务会被拦截；`assigned` 状态（此为正在节点执行的任务，一般不会特别多）的子任务无法被中断，后续将执行完成并计费。
- 停止是不可逆操作，任务一旦进入 `stopped` 状态将无法恢复继续执行，如需重新监控请重新[提交批量监控任务](./submit-task)。
