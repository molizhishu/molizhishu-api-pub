---
id: callback-config
title: Callback 回调
sidebar_position: 6
---

# Callback 回调

任务完成后，系统会主动将结果推送到您配置的回调地址，无需轮询查询。

---

## 回调地址

回调地址分两种：**全局 callback**（账号级别，通过接口设置）和**任务级 callback**（任务级别，提交任务时指定）。

| 类型 | 设置方式 | 作用范围 |
|------|---------|---------|
| 全局 callback | `PUT /api/business/monitor/task/callback-url` | 未单独指定地址的所有任务 |
| 任务级 callback | 提交任务时请求体的 `callbackUrl` 字段 | 仅该次任务 |

两者同时存在时，**任务级 callback 优先**。均未配置时任务完成后不触发回调。

提交任务的响应中会返回 `callbackUrl` 字段，反映本次任务实际生效的地址。

---

## 管理全局回调地址

### 查询 callback

**`GET /api/business/monitor/task/callback-url`** &nbsp; 需要认证

```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": "https://your-domain.com/callback"
}
```

`data` 为当前配置的地址字符串，未配置时返回 `null`。

### 修改 callback

**`PUT /api/business/monitor/task/callback-url`** &nbsp; 需要认证

**请求体：**

```json
{
    "callbackUrl": "https://your-domain.com/callback"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| callbackUrl | String | 否 | 新地址；传 `null` 或空字符串可清空 |

**响应：**

```json
{
    "success": true,
    "code": 200,
    "message": "回调地址更新成功",
    "data": null
}
```

---

## 回调类型

### 默认回调

未做任何特殊配置时，系统使用默认回调。任务完成后，系统向您的回调地址发送一次 **HTTP POST** 请求，`Content-Type` 为 `application/json`。

**请求体结构：**

```json
{
    "taskId": "task_abc123",
    "consumerTaskId": "consumerTask202606300001",
    "userId": 10001,
    "timestamp": 1712640000000,
    "status": "completed",
    "totalItems": 10,
    "completedItems": 9,
    "failedItems": 1,
    "subTaskList": [
        {
            "subTaskId": "sub_001",
            "platform": "deepseek",
            "mode": "search",
            "status": "completed",
            "...": "..."
        }
    ]
}
```

| 字段 | 类型 | 说明                                               |
|------|------|--------------------------------------------------|
| taskId | String | 任务唯一标识                                           |
| consumerTaskId | String | 客户侧任务唯一标识，仅用于提交幂等；提交时**未提供该字段则回调中也不包含此字段** |
| userId | Long | 发起任务的用户 ID                                       |
| timestamp | Long | 回调触发时间（毫秒级 Unix 时间戳）                             |
| status | String | 任务状态，如: `pending/processing/stopped/completed/partial_completed/failed` |
| totalItems | Integer | 子任务总数                                            |
| completedItems | Integer | 成功完成的子任务数                                        |
| failedItems | Integer | 失败的子任务数                                          |
| subTaskList | Array | 子任务结果列表，结构与[获取任务结果](./get-task-result.md)一致         |

**响应约定：**

您的服务返回 HTTP `2xx` 状态码即视为回调成功。非 `2xx` 响应或网络超时时，系统会按退避策略自动重试。

---

### 自定义回调

如您有以下需求，可联系我们进行对接，开启自定义回调：

- 请求体需要**特定签名**或**加密**（如 HMAC-SHA256 签名验证、AES 加密）
- 需要对接第三方平台接口（如需先获取 Access Token 再推送数据）
- 回调数据格式与默认格式不兼容，需要字段映射或定制

:::info 联系对接
自定义回调由我们在服务端配置，您无法通过 API 自行切换。如需开通，请联系对接人员说明您的签名算法或接口规范。
:::

---

## 回调失败处理

建议在您的回调接口中实现**幂等处理**，以应对重试场景（同一 `taskId` 可能收到多次推送）。

如需主动查询任务结果，可使用[获取任务结果](./get-task-result.md)作为补偿。
