---
id: get-available-models
title: 查询支持的模型列表
sidebar_position: 10
---

# 查询支持的模型列表

**接口地址:** `GET /api/business/system/models`

**接口描述:** 查询当前支持的 AI 模型列表，可用于提交任务前动态获取可选平台。

**需要认证:** 否

## 请求参数

无请求参数。

## curl 示例

```bash
curl -X GET "https://business-api.molizhishu.com/api/business/system/models"
```

## 响应结果

**成功响应:**

```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": [
        {
            "modelCode": "doubao",
            "modelName": "豆包",
            "description": "字节跳动的豆包大模型",
            "clientType": "web"
        },
        {
            "modelCode": "doubao_mobile",
            "modelName": "豆包移动端",
            "description": "豆包移动端 App",
            "clientType": "mobile"
        }
    ]
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| modelCode | String | 模型编码，提交任务时对应 `platform` 字段 |
| modelName | String | 模型展示名称 |
| description | String | 模型描述 |
| clientType | String | 客户端类型 |

## 使用说明

- 接口返回值会随后台模型配置动态变化，建议客户端以该接口返回的 `modelCode` 作为可选平台来源。
