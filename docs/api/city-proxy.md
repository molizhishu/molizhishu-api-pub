---
id: city-proxy
title: 获取可用区域列表
sidebar_position: 9
---

# 获取可用区域列表

在提交批量任务时，可以通过 `regionCode` 参数指定节点使用的区域。这样可以确保节点从指定地区发起请求，获取地域化的数据结果。

## 接口说明

**接口地址:** `GET /api/business/eip-edge/ports/city-info`

**接口描述:** 查询所有可用的区域信息，用于获取 `regionCode` 参数的可选值

**需要认证:** 否（公开接口）

## 请求参数

**Query 参数:**

| 参数名 | 类型 | 必需 | 默认值 | 描述 |
|-----|----|----|-----|----|
| 无   | -  | -  | -   | -  |

## 响应结果

**成功响应:**
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "province": "河南省",
      "regionCode": ["410000"]
    },
    {
      "province": "陕西省",
      "regionCode": ["610100"]
    }
  ]
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述                                                                                |
|--------|------|-----------------------------------------------------------------------------------|
| province | String | 区域名称                                                                              |
| regionCode | Array&lt;String&gt; | 区域代码数组（行政区划代码），用于提交任务时的 `regionCode` 参数。**当前提交任务仅支持指定 1 个 regionCode（数组长度必须为 1）** |

## 使用流程

```bash
# 步骤1: 获取可用区域列表
curl -X GET "https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info"

# 步骤2: 从响应中提取 regionCode
# 例如获取到：河南省-410000

# 步骤3: 提交任务时指定 regionCode
curl -X POST "https://business-api.molizhishu.com/api/business/monitor/task/batch/shared" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": ["人工智能发展趋势"],
    "platforms": [{"platform": "deepseek", "mode": "search"}],
    "regionCode": ["410000"]
  }'
```

## 注意事项

1. **regionCode 格式：** 必须是有效的行政区划代码，可以通过本接口获取
2. **单区域限制：** 当前仅支持指定 1 个 regionCode（数组长度必须为 1）
3. **未指定时的行为：** 如果不传 `regionCode` 参数，节点会使用默认策略
4. **代码有效性：** regionCode 必须是当前可用的端口对应的区域代码，否则可能导致任务执行失败
