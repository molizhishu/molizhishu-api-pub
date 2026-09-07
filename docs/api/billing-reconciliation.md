---
id: billing-reconciliation
title: 费用对账
sidebar_position: 9
---

# 费用对账

费用对账接口用于查询当前账号的消费汇总、消费明细和当前余额。目前仅支持统计 API 项目产生的消费记录，后续将支持非 API 项目，以及充值、赠送、解冻等非消费流水。

**需要认证:** 是

## 费用汇总查询

**接口地址:** `POST /api/reconciliation/summary`

**接口描述:** 查询指定日期范围内 API 项目的消费总金额和消费次数。返回结果会包含本次请求参数，便于客户侧对账落库。

### 请求参数

**Body 参数:**

| 字段名 | 类型 | 必需 | 描述 | 示例值 |
|--------|------|------|------|--------|
| startDate | String | 是 | 对账开始日期，格式：`yyyy-MM-dd` | "2026-06-01" |
| endDate | String | 是 | 对账结束日期，格式：`yyyy-MM-dd` | "2026-06-30" |
| aiModel | String | 否 | AI 模型过滤条件，详见[AI 平台列表](./overview#支持的-ai-平台列表)；不传则查询全部模型 | "doubao" |
| taskId | String | 否 | API 任务 ID；传入后只统计该任务下的消费记录 | "e619e12d90d644ae9e64ea26472df007" |

**请求限制:**

- `startDate` 不能晚于 `endDate`
- 单次查询日期范围最多支持 31 天
- 目前仅支持统计 API 项目产生的消费记录，后续将支持非 API 项目及非消费流水

### 请求示例

```json
{
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "aiModel": "doubao",
    "taskId": "e619e12d90d644ae9e64ea26472df007"
}
```

### curl 示例

```bash
curl -X POST "https://business-api.molizhishu.com/api/reconciliation/summary" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "aiModel": "doubao",
    "taskId": "e619e12d90d644ae9e64ea26472df007"
  }'
```

### 响应结果

**成功响应:**

```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "aiModel": "doubao",
        "taskId": "e619e12d90d644ae9e64ea26472df007",
        "totalCount": 1280,
        "totalConsume": "356.80"
    }
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| startDate | String | 请求参数：对账开始日期 |
| endDate | String | 请求参数：对账结束日期 |
| aiModel | String | 请求参数：AI 模型过滤条件；未传时为空字符串 |
| taskId | String | 请求参数：API 任务 ID；未传时为空字符串 |
| totalCount | Long | 消费记录总条数 |
| totalConsume | String | 消费总金额 |

## 费用明细查询

**接口地址:** `POST /api/reconciliation/records`

**接口描述:** 分页查询指定日期范围内 API 项目的消费明细。接口使用传统分页，明细按交易时间倒序返回。

### 请求参数

**Body 参数:**

| 字段名 | 类型 | 必需 | 默认值 | 描述 | 示例值 |
|--------|------|------|--------|------|--------|
| startDate | String | 是 | - | 对账开始日期，格式：`yyyy-MM-dd` | "2026-06-01" |
| endDate | String | 是 | - | 对账结束日期，格式：`yyyy-MM-dd` | "2026-06-30" |
| aiModel | String | 否 | - | AI 模型过滤条件，详见[AI 平台列表](./overview#支持的-ai-平台列表)；不传则查询全部模型 | "doubao" |
| taskId | String | 否 | - | API 任务 ID；传入后只查询该任务下的消费明细 | "e619e12d90d644ae9e64ea26472df007" |
| pageNum | Integer | 否 | 1 | 页码，从 1 开始 | 1 |
| pageSize | Integer | 否 | 100 | 每页条数，最大 1000 | 100 |

**请求限制:**

- `startDate` 不能晚于 `endDate`
- 单次查询日期范围最多支持 31 天
- `pageSize` 最大支持 1000
- 分页查询深度超过限制时会返回错误，请缩小时间范围或增加筛选条件后重试
- 目前仅支持统计 API 项目产生的消费记录，后续将支持非 API 项目及非消费流水

### 请求示例

```json
{
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "aiModel": "doubao",
    "taskId": "e619e12d90d644ae9e64ea26472df007",
    "pageNum": 1,
    "pageSize": 100
}
```

### curl 示例

```bash
curl -X POST "https://business-api.molizhishu.com/api/reconciliation/records" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "aiModel": "doubao",
    "taskId": "e619e12d90d644ae9e64ea26472df007",
    "pageNum": 1,
    "pageSize": 100
  }'
```

### 响应结果

**成功响应:**

```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "records": [
            {
                "id": 10001,
                "taskId": "e619e12d90d644ae9e64ea26472df007",
                "subTaskId": 20001,
                "taskCreatedTime": 1781917200000,
                "taskCompletedTime": 1781919012000,
                "transactionTime": 1781920812000,
                "amount": "0.18",
                "description": "豆包（网页版）+深度思考",
                "aiModel": "doubao",
                "aiModelText": "豆包（网页版）",
                "question": "目前市场上销量较高的手机品牌有哪些"
            }
        ],
        "total": 1280,
        "currentPage": 1,
        "pageSize": 100,
        "totalPages": 13
    }
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| records | Array | 消费明细列表 |
| records[].id | Long | 计费流水 ID |
| records[].taskId | String | API 任务 ID |
| records[].subTaskId | Long | API 子任务 ID，对应子任务查询接口中的 `subTaskId` |
| records[].taskCreatedTime | Long | 任务创建时间，Unix 时间戳，单位秒 |
| records[].taskCompletedTime | Long | 任务完成时间，Unix 时间戳，单位秒 |
| records[].transactionTime | Long | 交易时间，Unix 时间戳，单位秒 |
| records[].amount | String | 消费金额 |
| records[].description | String | 消费备注 |
| records[].aiModel | String | AI 模型原始值 |
| records[].aiModelText | String | AI 模型展示名称 |
| records[].question | String | 本次消费对应的问题 |
| total | Long | 符合条件的消费记录总条数 |
| currentPage | Integer | 当前页码 |
| pageSize | Integer | 本次查询每页条数 |
| totalPages | Integer | 总页数 |

## 当前余额查询

**接口地址:** `GET /api/reconciliation/balance`

**接口描述:** 查询当前账号可用余额。

### 请求参数

无。

### curl 示例

```bash
curl -X GET "https://business-api.molizhishu.com/api/reconciliation/balance" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 响应结果

**成功响应:**

```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "currentBalance": "1288.66"
    }
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| currentBalance | String | 当前账号可用余额 |

## 错误响应

```json
{
    "success": false,
    "code": 400,
    "message": "单次对账查询最多支持31天",
    "data": null
}
```

常见错误：

| code | message | 说明 |
|------|---------|------|
| 400 | 请选择对账时间范围 | `startDate` 或 `endDate` 为空 |
| 400 | 开始时间不能晚于结束时间 | `startDate` 晚于 `endDate` |
| 400 | 单次对账查询最多支持31天 | 查询日期范围超过 31 天 |
| 400 | pageSize 最大支持1000 | 明细查询 `pageSize` 超过 1000 |
| 400 | 查询结果较多，请缩小时间范围或增加筛选条件后重试 | 明细查询分页深度超过限制 |
