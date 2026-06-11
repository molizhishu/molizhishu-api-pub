---
id: vibecoding-polling-prompt
title: 轮询方案提示词
sidebar_position: 10
---

# 轮询方案提示词

本提示词用于指导 AI 编程工具实现「主动调用 API + 轮询查询结果」方案。该方案不依赖公网 callback 地址，适合客户系统主动提交任务、主动查询状态、主动拉取并保存最终结果。

:::tip 使用方式
将下面整段提示词复制给 Cursor、Codex、Claude Code 等 AI 编程工具。请先把 `MOLIZHISHU_TOKEN` 配置到运行环境，不要把 Token 写进代码。
:::

## 完整提示词

```text
你是资深后端工程师，请在当前项目中接入「模力指数监控 API」，实现基于主动轮询的任务提交、状态查询、结果拉取和本地存储能力。

请先阅读当前项目结构，沿用项目已有的代码风格、配置方式、日志方式、HTTP 客户端、数据库访问方式、错误处理方式和测试框架。不要引入不必要的新框架。不要把 Token 写死在代码、前端、README、测试数据或日志中，建议从环境变量或配置文件中读取。

一、接入目标

实现一个完整的主动轮询方案：
1. 我方系统调用模力指数 API 提交监控任务。
2. 保存 taskId、提交参数、初始状态和子任务摘要。
3. 我方系统按需主动调用状态接口查询任务进度。
4. 任务进入终态后，调用结果接口拉取完整结果。
5. 将完整结果保存到本地数据库。
6. 对外提供本地 API，用于查询已保存的任务列表、任务详情、子任务结果和原始响应。
7. 日志必须清楚区分「读取本地数据库」和「实际调用模力指数远端接口」。

二、接口基础信息

Base URL:
https://business-api.molizhishu.com/api/business/monitor

认证方式：
Authorization: Bearer <token>

Token 配置：
- 环境变量名：MOLIZHISHU_TOKEN
- Token 只能服务端使用，不能暴露给前端
- 不建议在代码仓库中写入真实 Token

响应格式：
- 正常响应通常为 JSON：
  {
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {}
  }
- 业务失败也可能 HTTP 200，必须以 success/code/message 判断业务成功或失败
- 错误响应可能没有 data 字段，例如：
  {
    "success": false,
    "code": 500,
    "message": "Token失效"
  }

三、必须封装的模力指数 API Client

请封装 MolizhishuClient 或符合项目命名习惯的客户端，至少包含：

1. SubmitTask
   POST /task/batch/shared

2. GetTaskStatus
   GET /task/status/{taskId}

3. GetTaskResult
   GET /task/result/{taskId}

4. GetTaskList，可选但建议实现，用于调试和导入远端已有任务
   GET /task/list?page=1&size=20&status=completed

5. GetCities，可选但建议实现，用于获取可用区域
   GET https://business-api.molizhishu.com/api/business/eip-edge/ports/city-info

Client 要求：
- 自动添加 Authorization 请求头
- 自动设置 Accept: application/json
- POST/PUT 请求自动设置 Content-Type: application/json
- 支持超时配置，建议默认 30 秒
- 统一解析 success/code/message/data
- success=false 时返回业务异常，异常中包含 code 和 message
- HTTP 非 2xx 时返回 HTTP 异常，并保留响应体用于排查
- 所有远端调用日志必须包含 source、method、url、http_status、success、code、message、duration
- 日志中不得打印 Token

四、提交任务接口

远端接口：
POST /task/batch/shared

请求体字段：
{
  "monitorKeywords": "品牌或监控关键词，可选",
  "prompts": ["用户要监控的问题"],
  "platforms": [
    {"platform": "deepseek", "mode": "search", "screenshot": 1}
  ],
  "regionCode": ["410000"]
}

字段说明：
- monitorKeywords：可选，字符串
- prompts：必填，字符串数组，最多 50 个
- platforms：必填，数组；同一 platform 会按名称去重，实际任务数以响应 totalTask 为准
- platforms[].platform：必填，可选 deepseek、doubao、yuanbao、kimi、qianwen、quark、baiduai、weibo_zhisou、wenxinyiyan、doubao_mobile 等
- platforms[].mode：必填，可选 standard、reasoning、search、reasoning_search
- platforms[].screenshot：可选，0 不截图，1 截图，2 提及截图
- regionCode：可选，数组；当前最多传 1 个，例如 ["410000"]
- 轮询方案中不需要传 callbackUrl；如果传了 callbackUrl，也不得依赖 callback 完成主流程

提交成功响应 data：
{
  "taskId": "ec617e1996174c129a872680fa27078e",
  "totalTask": 1,
  "status": "pending",
  "pollUrl": "/api/business/monitor/task/status/ec617e1996174c129a872680fa27078e",
  "callbackUrl": null,
  "subTaskList": [
    {
      "subTaskId": "4124831",
      "prompt": "用户要监控的问题",
      "platform": "deepseek",
      "mode": "search",
      "status": "pending"
    }
  ]
}

提交成功后必须保存：
- taskId
- status
- prompts 原始 JSON
- platforms 原始 JSON
- regionCode 原始 JSON
- totalTask 或 totalItems
- pollUrl
- callbackUrl，通常为 null
- subTaskList 初始摘要
- rawRequest
- rawResponse
- created_local_at、updated_at

五、任务状态查询

远端接口：
GET /task/status/{taskId}

响应 data 字段：
- taskId：主任务 ID
- status：主任务状态
- message：进度说明，例如 "任务进度: 3/4 已完成, 0 失败"
- totalItems：子任务总数
- completedItems：已完成数量
- failedItems：失败数量
- createdAt：毫秒级 Unix 时间戳
- completedAt：毫秒级 Unix 时间戳；未完成时为 null
- subTaskList：子任务进度摘要

subTaskList 摘要字段：
- subTaskId
- prompt
- platform
- mode
- status

主任务状态：
- pending：等待执行
- processing：执行中
- completed：全部完成且无失败
- partial_completed：部分完成，有成功也有失败
- failed：全部失败
- stopped：已停止

子任务状态：
- pending：等待执行
- assigned：已分配
- processing：处理中
- completed：完成
- stopped：已停止
- failed：失败
- error：错误

终态判断：
- completed
- partial_completed
- failed
- stopped

只要任务未进入终态，就不要重复提交任务，只更新本地状态和进度。

六、完整结果拉取

远端接口：
GET /task/result/{taskId}

只在主任务进入 completed、partial_completed、failed 或 stopped 后调用。stopped 任务也可能包含已完成子任务，应保存已有结果。

结果响应 data 字段：
- taskId
- status
- totalItems
- completedItems
- failedItems
- subTaskList

子任务完整字段必须尽量完整保存：
- subTaskId：子任务 ID
- platform：平台
- mode：模式
- prompt：原始问题
- status：子任务状态
- time：毫秒级 Unix 时间戳，可能为空
- pageScreenshot：截图 URL，可能是 URL、空字符串、null 或字段缺失
- answerContent：AI 回答内容，通常是 Markdown，但可能混合 HTML 片段，例如视频卡片、媒体网格
- referenceList：全部引用来源数组，可能为空
- citationList：答案中实际引用的来源数组，可能为空
- reasoningProcess：推理过程对象，常见字段 summary、content，可能为 null
- recommendedQuestions：推荐追问数组，可能为空数组、null 或字段缺失
- mediaContent：媒体内容数组，可能为空数组、null 或字段缺失
- errorMessage：失败原因，成功时通常为 null
- proxyIp：执行节点 IP，可能为空

referenceList/citationList 单项字段：
- index
- title
- url
- site
- icon，可能为 null 或相对路径

保存要求：
- 不要只保存 answerContent
- 必须保存每个子任务 rawResult JSON
- JSON 字段使用 JSON/JSONB/TEXT 均可，但必须保留原始结构
- answerContent 不要在后端擅自清洗；展示层再根据安全策略处理 Markdown/HTML

七、本地数据库建议

如果当前项目没有现成表结构，请创建以下结构或等价结构。

tasks：
- task_id，主键
- status
- prompts_json
- platforms_json
- region_code_json
- total_items
- completed_items
- failed_items
- poll_url
- callback_url
- created_at，远端毫秒时间戳
- completed_at，远端毫秒时间戳
- raw_request_json
- raw_response_json
- last_error
- created_local_at
- updated_at

subtasks：
- subtask_id，主键
- task_id
- platform
- mode
- prompt
- status
- time
- page_screenshot
- answer_content
- reference_list_json
- citation_list_json
- reasoning_process_json
- recommended_questions_json
- media_content_json
- error_message
- proxy_ip
- raw_result_json
- updated_at

sync_events，可选但建议：
- id
- task_id
- source，例如 submit-task、manual-sync、background-poller
- action，例如 submit、status、result
- request_url
- http_status
- success
- code
- message
- error_message
- started_at
- finished_at

八、本地业务 API 要求

请对外提供以下接口，路径可按项目规范调整，但语义必须完整。

1. 创建任务
   POST /api/tasks

请求体：
{
  "monitorKeywords": "可选",
  "prompts": ["请帮我搜索新能源汽车销量趋势"],
  "platforms": [
    {"platform": "deepseek", "mode": "search", "screenshot": 0}
  ],
  "regionCode": ["410000"]
}

行为：
- 调用远端 SubmitTask
- 保存任务和初始子任务
- 返回 taskId、status、totalTask、pollUrl、subTaskList
- 日志 source=local-api:submit-task

2. 查询本地任务列表
   GET /api/tasks?page=1&size=20&status=completed

行为：
- 只读本地数据库
- 不调用模力指数远端接口
- 返回分页、任务摘要、完成数量、失败数量
- 日志必须能看出是 local read

3. 查询本地任务详情
   GET /api/tasks/{taskId}

行为：
- 只读本地数据库
- 返回任务详情、子任务完整结果、原始响应
- 不调用模力指数远端接口

4. 主动同步任务
   POST /api/tasks/{taskId}/sync

行为：
- 调用远端 GetTaskStatus
- 保存状态和子任务进度
- 如果进入终态，再调用远端 GetTaskResult
- 保存完整结果
- 支持同步远端已有 taskId 到本地库
- 日志 source=local-api:manual-sync

5. 可选：获取可用区域
   GET /api/cities

行为：
- 调用 city-info 接口
- 返回 data 数组，元素包含 province 和 regionCode

九、轮询策略

推荐默认策略：
- 默认不启动后台自动轮询，避免客户误以为只是查询本地数据但实际发生远端抓取
- 通过显式配置启用后台补偿，例如 MOLIZHISHU_BACKGROUND_POLLER=true
- 默认轮询间隔 10 秒，可配置
- 只轮询 pending、assigned、processing 状态任务
- 同一个 taskId 必须避免并发同步
- 网络异常时记录 last_error，不要快速无限重试
- 任务进入终态后停止轮询

如果业务要求提交后自动拉取结果：
- 可以在提交成功后启动后台轮询
- 但必须在日志中清楚标记 source=background-poller
- 必须在 README 或配置说明中明确告知会主动请求模力指数远端接口

十、日志要求

日志必须能回答这几个问题：
- 当前请求是否只是读取本地数据库？
- 是否实际调用了模力指数接口？
- 是提交任务、手动同步，还是后台轮询触发？
- 远端接口是否业务成功？

建议日志格式：
[local] method=GET path=/api/tasks/{taskId} duration=2ms
[molizhishu] source=local-api:submit-task method=POST url=https://.../task/batch/shared http_status=200 success=true code=200 message="批量任务已提交" duration=328ms
[molizhishu] source=local-api:manual-sync:status method=GET url=https://.../task/status/{taskId} http_status=200 success=true code=200 message="操作成功" duration=120ms
[molizhishu] source=background-poller:result method=GET url=https://.../task/result/{taskId} http_status=200 success=true code=200 message="操作成功" duration=300ms

十一、错误处理

必须处理：
- Token 失效：success=false，code=500，message="Token失效"，且可能没有 data
- 参数错误：success=false，code=300001
- 余额不足：success=false，code=500001
- 无权访问任务：code=403
- 任务不存在：code=404
- HTTP 非 2xx
- 网络超时
- JSON 解码失败
- 子任务失败，保存 errorMessage

错误响应给本地调用方时，不要泄露 Token，不要吞掉远端 code/message。

十二、测试要求

请补充自动化测试，至少覆盖：
- SubmitTask 成功后保存 taskId 和初始子任务
- success=false 时返回业务异常
- Token 失效响应没有 data 时也能正确处理
- GetTaskStatus 返回 processing 时只更新状态，不拉结果
- GetTaskStatus 返回 completed 时拉取并保存结果
- partial_completed 时保存成功子任务和失败子任务 errorMessage
- GET /api/tasks/{taskId} 只读本地库，不调用远端
- 同一个 taskId 并发 sync 时只有一个远端同步执行

十三、交付要求

完成后请提供：
- 代码实现
- 数据库迁移或建表脚本
- README，说明环境变量、启动方式、提交任务、手动同步、查询本地结果、启用后台轮询的方法
- curl 示例
- 测试结果
- 说明哪些接口会调用模力指数远端，哪些接口只读本地数据库
```

## 验收清单

- 提交任务时确实调用 `POST /task/batch/shared`
- 本地查询任务列表和详情不会调用远端接口
- 手动同步会调用 `GET /task/status/{taskId}`
- 终态后会调用 `GET /task/result/{taskId}`
- `pageScreenshot` 空字符串、`recommendedQuestions: null`、`reasoningProcess: null` 等真实返回能被正确保存
- 日志能清楚看出数据来源
