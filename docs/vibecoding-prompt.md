---
id: vibecoding-prompt
title: 模力指数 API 接入统一提示词
sidebar_position: 10
---

# 模力指数 API 接入统一提示词

本提示词用于指导 AI 编程工具实现「提交任务 + Callback + 轮询补偿」的一体化接入方案。

Callback 和轮询不是互斥方案：

- 如果配置了任务级 `callbackUrl` 或全局 `MOLIZHISHU_CALLBACK_URL`，提交任务时应带上 Callback，并继续保留后台轮询补偿，避免 Callback 丢失、延迟或处理失败导致数据不完整。
- 如果没有配置 Callback，系统仍然可以正常提交任务，并通过后台轮询/手动同步拉取状态和结果。
- 本地任务列表和详情接口永远只读本地数据库，不隐式请求模力指数远端。

:::tip 使用方式
将下面整段提示词复制给 Cursor、Codex、Claude Code 等 AI 编程工具。请先把 `MOLIZHISHU_TOKEN` 配置到运行环境，不要把 Token 写进代码、前端、README、测试数据或日志。
:::

## API 文档来源

本仓库的 `docs/api` 目录是模力指数 API 的完整文档目录，接入前必须优先阅读：

- `docs/api/overview.md`：接口总览
- `docs/api/submit-task.md`：提交监控任务
- `docs/api/query-task-status.md`：查询任务状态
- `docs/api/get-task-result.md`：获取任务结果
- `docs/api/get-subtask-result.md`：获取子任务结果
- `docs/api/get-task-list.md`：获取任务列表
- `docs/api/stop-task.md`：停止监控任务
- `docs/api/callback-config.md`：Callback 配置
- `docs/api/city-proxy.md`：城市/区域编码
- `docs/api/error-handling.md`：错误处理
- `docs/api/usage-guide.md`：接入指南

## 完整提示词

```text
你是资深后端工程师，请在当前项目中接入「模力指数监控 API」，实现任务提交、Callback 接收、轮询补偿、结果落库、本地查询和管理端鉴权能力。

请先阅读当前项目结构，沿用项目已有的代码风格、配置方式、日志方式、HTTP 客户端、数据库访问方式、错误处理方式和测试框架。不要引入不必要的新框架。不要把 Token 写死在代码、前端、README、测试数据或日志中，必须从环境变量或安全配置读取。

必须先阅读当前仓库的 docs/api 目录。该目录是模力指数 API 的完整文档目录，包含提交任务、查询状态、获取结果、停止任务、Callback 配置、城市区域、错误处理等接口说明。实现细节以 docs/api 为准。

一、接入目标

实现一个完整的一体化接入方案：
1. 我方系统调用模力指数 API 提交监控任务。
2. 保存 taskId、提交参数、初始状态、子任务摘要、rawRequest 和 rawResponse。
3. 如果配置了任务级 callbackUrl 或全局 MOLIZHISHU_CALLBACK_URL，提交任务时传入 callbackUrl，或维护远端全局 Callback 配置。
4. 提供 POST /webhooks/molizhishu 接收模力指数 Callback，幂等保存原始 payload、主任务状态和完整子任务结果。
5. 无论是否启用 Callback，都必须提供手动同步和后台轮询补偿能力，保证本地数据最终一致。
6. 如果没有配置 Callback，系统直接使用轮询补偿机制拉取状态和结果。
7. 对外提供本地 API，用于查询已保存的任务列表、任务详情、子任务结果、Callback 记录和原始响应。
8. 日志必须清楚区分「读取本地数据库」「提交任务」「Callback 推送」「手动同步」「后台轮询补偿」。
9. 如果需要适配本仓库的 React 管理端，还必须实现平台登录鉴权：管理员登录、Bearer Token 校验、当前用户、退出登录和设置页接口。

二、接口基础信息

Base URL:
https://business-api.molizhishu.com/api/business/monitor

认证方式：
Authorization: Bearer <token>

Token 配置：
- 环境变量名：MOLIZHISHU_TOKEN
- Token 只能服务端使用，不能暴露给前端
- 不允许在代码仓库中写入真实 Token

Callback 配置：
- 环境变量名：MOLIZHISHU_CALLBACK_URL
- 有值时，提交任务默认使用该地址作为任务级 callbackUrl
- 无值时，提交任务不传 callbackUrl，系统依靠轮询补偿同步结果
- 生产环境 callbackUrl 必须是模力指数服务端可访问的 HTTPS 地址

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

4. StopTask
   按 docs/api/stop-task.md 实现

5. GetCallbackURL
   GET /task/callback-url

6. UpdateCallbackURL
   PUT /task/callback-url

7. GetTaskList，可选但建议实现，用于调试和导入远端已有任务
   GET /task/list

8. GetCities，可选但建议实现，用于获取可用区域
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

四、提交任务

远端接口：
POST /task/batch/shared

请求体字段：
{
  "monitorKeywords": "品牌或监控关键词，可选",
  "prompts": ["用户要监控的问题"],
  "platforms": [
    {"platform": "deepseek", "mode": "search", "screenshot": 1}
  ],
  "regionCode": ["410000"],
  "callbackUrl": "https://your-domain.com/webhooks/molizhishu"
}

字段说明：
- monitorKeywords：可选，字符串
- prompts：必填，字符串数组，最多 50 个
- platforms：必填，数组；同一 platform 会按名称去重，实际任务数以响应 totalTask 为准
- platforms[].platform：必填，可选 deepseek、doubao、yuanbao、kimi、qianwen、quark、baiduai、weibo_zhisou、wenxinyiyan、doubao_mobile 等
- platforms[].mode：必填，可选 standard、reasoning、search、reasoning_search
- platforms[].screenshot：可选，0 不截图，1 截图，2 提及截图
- regionCode：可选，数组；当前最多传 1 个，例如 ["410000"]
- callbackUrl：可选；有任务级 callbackUrl 时优先使用任务级，没有时使用 MOLIZHISHU_CALLBACK_URL，没有配置时不传

提交成功响应 data 通常包含：
{
  "taskId": "ec617e1996174c129a872680fa27078e",
  "totalTask": 1,
  "status": "pending",
  "pollUrl": "/api/business/monitor/task/status/ec617e1996174c129a872680fa27078e",
  "callbackUrl": "https://your-domain.com/webhooks/molizhishu",
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
- callbackUrl，本次任务实际生效地址，可能为 null
- subTaskList 初始摘要
- rawRequest
- rawResponse
- created_local_at、updated_at

五、Callback 接收

请提供：
POST /webhooks/molizhishu

Callback 处理要求：
- 限制请求体大小，避免异常大 payload
- 校验 JSON 格式
- 校验 taskId 和 status
- 保存原始 payload
- 必须做幂等，同一个 taskId 可能收到多次推送
- 建议使用 taskId + payload hash 记录 callback event
- 保存主任务状态、完成数量、失败数量
- upsert 保存所有子任务结果
- 数据落库成功后再返回 2xx
- 处理失败时返回非 2xx，让模力指数重试
- 不要在 callback 接口里做耗时很长的下游业务；如需下游处理，先落库再异步处理

Callback payload 顶层字段通常包含：
- taskId：主任务 ID，必填
- userId：发起任务的用户 ID，可能为空或缺失
- timestamp：回调触发时间，毫秒级 Unix 时间戳，可能为空或缺失
- status：主任务状态，必填
- totalItems
- completedItems
- failedItems
- subTaskList：子任务结果列表

六、任务状态与结果同步

状态接口：
GET /task/status/{taskId}

结果接口：
GET /task/result/{taskId}

主任务状态只使用以下值：
- pending：任务已创建，等待开始执行
- processing：任务执行中
- completed：任务全部完成且无失败
- partial_completed：任务部分完成，有成功也有失败
- failed：任务全部失败
- stopped：任务被人工停止

主任务终态：
- completed
- partial_completed
- failed
- stopped

子任务状态可能包含：
- pending
- assigned
- processing
- completed
- stopped
- failed
- error

同步规则：
- GET /api/tasks 和 GET /api/tasks/{taskId} 只读本地数据库，不隐式请求远端
- POST /api/tasks/{taskId}/sync 才主动调用远端状态/结果接口
- 后台轮询扫描未完成、没有子任务、子任务未完成、或主任务已完成但子任务结果未完整入库的任务
- 状态接口出现 completedItems > 0 或任一子任务进入终态时，应拉取 result 接口并保存已完成结果，不必等待全部子任务完成
- stopped 任务也可能包含已完成子任务，必须保存已有结果
- 同一个 taskId 必须避免并发同步
- 网络异常时记录 last_error，不要快速无限重试
- 主任务与全部子任务结果完整入库后停止轮询

七、完整结果保存要求

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
- 保存远端状态或结果时，不要覆盖本地提交时保存的 prompts_json、platforms_json、region_code_json、callback_url、raw_request_json

八、本地数据库建议

如果当前项目没有现成表结构，请创建以下结构或等价结构。表名建议统一使用 geo_ 前缀。

geo_tasks：
- task_id，主键
- status
- prompts_json
- platforms_json
- region_code_json
- callback_url
- total_items
- completed_items
- failed_items
- poll_url
- created_at，远端毫秒时间戳
- completed_at，远端毫秒时间戳
- raw_request_json
- raw_response_json
- last_error
- created_local_at
- updated_at

geo_subtasks：
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

geo_callback_events：
- id
- task_id
- payload_json
- payload_hash
- process_status，例如 processed、duplicate、failed
- error_message
- received_at
- processed_at

geo_compensation_events，可选但建议：
- id
- task_id
- source，例如 manual-sync、background-sync
- action，例如 status、result、stop
- request_url
- http_status
- success
- code
- message
- error_message
- started_at
- finished_at

geo_admin_users：
- id
- username
- password_hash
- display_name
- role
- status
- last_login_at
- created_at
- updated_at

九、本地业务 API 要求

请对外提供以下接口，路径可按项目规范调整，但语义必须完整。

0. 平台登录与鉴权
   POST /api/auth/login
   GET /api/auth/me
   POST /api/auth/logout

行为：
- 登录请求体：{"username":"admin","password":"molizhishu"}
- 登录成功返回：token、expiresAt、user
- user 至少包含 id、username、displayName、role
- 除登录、健康检查和 callback 外，本地 /api/** 接口必须校验 Authorization: Bearer <token>
- Token 只保存哈希值，建议 7 天过期
- 默认管理员可通过初始化 SQL 创建，默认密码为 molizhishu，生产环境必须提醒修改

1. 创建任务
   POST /api/tasks

行为：
- 读取请求体 callbackUrl；如果没有则读取 MOLIZHISHU_CALLBACK_URL；如果仍为空则不传 callbackUrl
- 调用远端 SubmitTask
- 保存任务和初始子任务
- 返回 taskId、status、totalTask、pollUrl、callbackUrl、subTaskList
- 日志 source=local-api:submit-task

2. Callback 接收
   POST /webhooks/molizhishu

行为：
- 接收模力指数推送
- 保存 callback event
- 幂等更新任务和子任务结果
- 成功返回 2xx
- 日志标记为 callback，不要标记成主动轮询

3. 查询本地任务列表
   GET /api/tasks?page=1&size=20&status=completed

行为：
- 只读本地数据库
- 不调用模力指数远端接口
- 返回分页、任务摘要、完成数量、失败数量

4. 查询本地任务详情
   GET /api/tasks/{taskId}

行为：
- 只读本地数据库
- 返回任务详情、子任务完整结果、Callback 处理状态、原始响应
- 不调用模力指数远端接口

5. 手动同步任务
   POST /api/tasks/{taskId}/sync

行为：
- 用于 Callback 未收到、Callback 失败、无 Callback 配置或人工排查
- 调用远端 GetTaskStatus
- 如果已出现可用结果，再调用远端 GetTaskResult
- 保存完整结果
- 支持同步远端已有 taskId 到本地库
- 日志 source=local-api:manual-sync

6. 停止未完成任务
   PUT /api/tasks/{taskId}/stop

行为：
- 调用远端停止任务接口
- 保存远端返回状态和已产出的子任务结果
- stopped 是合法终态

7. 查询全局 Callback
   GET /api/callback-url

8. 设置或清空全局 Callback
   PUT /api/callback-url

请求体：
{
  "callbackUrl": "https://your-domain.com/webhooks/molizhishu"
}

或：
{
  "callbackUrl": null
}

9. 获取可用区域
   GET /api/cities

10. 系统设置
   GET /api/settings
   PUT /api/settings/api-key

行为：
- API Key 只保存在服务端，不进入前端构建产物
- demo 默认允许页面配置 API Key
- 生产环境可通过 MOLIZHISHU_ALLOW_API_KEY_UPDATE=false 禁止页面修改 API Key

十、后台同步策略

推荐默认策略：
- demo 默认启动后台自动轮询/补偿，保证本地数据库最终一致；生产环境可通过 MOLIZHISHU_SYNC_ENABLED=false 关闭
- 推荐配置：MOLIZHISHU_SYNC_ENABLED、MOLIZHISHU_SYNC_INTERVAL_SECONDS、MOLIZHISHU_SYNC_LIMIT
- 默认轮询间隔 60 秒，可配置
- Callback 是加速路径，不是唯一数据来源；轮询补偿是最终一致性保障
- 没有配置 Callback 时，轮询补偿就是主同步机制
- 必须在 README 或配置说明中明确告知后台同步会主动请求模力指数远端接口

后台轮询实现方式：
- PHP 等脚本运行时建议使用独立 worker 容器或 CLI 进程执行同步循环
- Go/Python/.NET/Rust/Node.js 等常驻服务优先使用进程内定时器、BackgroundService、Tokio interval、lifespan task 或框架调度器
- Spring Boot 项目必须使用 schedule 包 + @Scheduled 表达定时任务，业务同步逻辑仍放在 service 包
- 必须在日志中清楚标记 source，例如 php-worker、golang-sync-loop、java-scheduled-sync

十一、时区与时间

- Docker 和服务端运行时必须显式设置业务时区，默认建议 TZ=Asia/Shanghai
- MySQL 建议设置 --default-time-zone=+08:00
- 本地 DATETIME 字段按东八区保存
- 远端毫秒级时间戳由前端按东八区格式化显示
- 不要因为容器默认 UTC 导致任务时间偏移 8 小时

十二、日志要求

日志必须能回答这几个问题：
- 当前请求是否只是读取本地数据库？
- 是否实际调用了模力指数远端接口？
- 数据是否来自 Callback？
- 是提交任务、手动同步、停止任务，还是后台轮询触发？
- Callback 是否重复推送？
- 远端接口是否业务成功？

建议日志格式：
[local] method=GET path=/api/tasks/{taskId} duration=2ms
[molizhishu] source=local-api:submit-task method=POST url=https://.../task/batch/shared http_status=200 success=true code=200 message="批量任务已提交" duration=328ms
[callback] task_id=xxx status=completed total=1 completed=1 failed=0 duplicate=false saved=true
[molizhishu] source=local-api:manual-sync:status method=GET url=https://.../task/status/{taskId} http_status=200 success=true code=200 message="操作成功" duration=120ms
[molizhishu] source=background-sync:result method=GET url=https://.../task/result/{taskId} http_status=200 success=true code=200 message="操作成功" duration=300ms

十三、安全要求

- 生产环境 callbackUrl 必须使用 HTTPS
- 如果项目已有鉴权、中间件、IP 白名单或网关规则，请按现有规范接入
- 默认 Callback 文档未要求签名；如果客户需要 HMAC-SHA256、AES 加密、字段映射或第三方平台转发，请预留扩展点，并提示需要联系模力指数对接人员开通自定义回调
- Callback payload 可能较大，必须限制请求体大小
- answerContent 可能包含 HTML，后端保存原文，前端展示时必须按安全策略渲染或清洗
- 不要在日志中打印完整 answerContent，避免日志过大和泄露业务内容
- 不要在日志、错误响应、README、测试快照中泄露 Token

十四、错误处理

必须处理：
- Token 失效：success=false，code=500，message="Token失效"，且可能没有 data
- 参数错误：success=false，code=300001
- 余额不足：success=false，code=500001
- 无权访问任务：code=403
- 任务不存在：code=404
- HTTP 非 2xx
- 网络超时
- JSON 解码失败
- Callback payload 缺少 taskId 或 status
- Callback 重复推送
- 子任务失败，保存 errorMessage

错误响应给本地调用方时，不要泄露 Token，不要吞掉远端 code/message。

十五、不同技术栈落地建议

如果用户没有指定具体架构，请优先选择对应语言的主流、易部署方案：
- Go：Gin/Fiber + GORM/sqlc + MySQL/PostgreSQL，HTTP Client 用标准库或 resty。必须用 context timeout，不要在 handler 中无限等待。
- Java：Spring Boot 3 + MyBatis/MyBatis-Plus + MySQL，HTTP Client 可用 RestClient/WebClient。事务边界放在 Service 层，定时轮询放在 schedule 包并使用 @Scheduled。
- Python：FastAPI + SQLAlchemy + httpx + MySQL/PostgreSQL，远端调用建议 async，后台轮询建议使用 FastAPI lifespan 挂载独立 schedule 模块，并用 APScheduler AsyncIOScheduler 表达定时任务。
- .NET：ASP.NET Core Minimal API/Web API + Dapper/EF Core + MySQL/PostgreSQL，HTTP Client 使用 IHttpClientFactory，后台轮询用 BackgroundService，Token 只在服务端配置。
- Rust：Axum/Actix-web + sqlx/SeaORM + MySQL/PostgreSQL，远端调用使用 reqwest，后台轮询用 Tokio task + tokio::time::interval，所有 I/O 必须设置超时。
- React/Vue 技术栈：这里指 Node.js 后端 API demo，可用 Express/NestJS/Fastify + mysql2/Prisma/Knex + MySQL，后台轮询用服务端定时器，不能把 Token 放到浏览器端。
- PHP：PHP 8 + ThinkPHP/Laravel/Symfony 均可，按项目现有框架封装 Service/Repository；后台轮询建议独立 CLI worker/队列进程。

十六、测试要求

请补充自动化测试，至少覆盖：
- SubmitTask 成功后保存 taskId、callbackUrl 和初始子任务
- 未配置 Callback 时，提交任务不传 callbackUrl，后台轮询仍能同步结果
- 配置 Callback 时，提交任务传入 callbackUrl，Callback 首次推送成功落库
- Callback 重复推送不会重复创建子任务或重复触发下游业务
- success=false 时返回业务异常
- Token 失效响应没有 data 时也能正确处理
- GetTaskStatus 返回 processing 时只更新状态，不拉完整结果
- 状态接口显示 completedItems > 0 时能提前拉取并保存已完成子任务
- partial_completed 时保存成功子任务和失败子任务 errorMessage
- stopped 任务也保存已经产出的子任务结果
- GET /api/tasks/{taskId} 只读本地库，不调用远端
- 手动同步能调用 status/result 并保存完整结果
- 同一个 taskId 并发 sync 时只有一个远端同步执行

十七、交付要求

完成后请提供：
- 代码实现
- 数据库迁移或建表脚本
- README，说明环境变量、启动方式、Callback 配置方式、无 Callback 时的轮询方式、提交任务、模拟 Callback、查询本地结果、手动同步的方法
- Docker Compose，一键启动 API、数据库、公共前端和必要后台同步进程
- curl 示例
- 测试结果
- 说明哪些接口会调用模力指数远端，哪些接口只读本地数据库，哪些接口接收模力指数 Callback
```

## 验收清单

- 已阅读 `docs/api` 中的完整 API 文档。
- 提交任务时确实调用 `POST /task/batch/shared`。
- 有 Callback 配置时会传入 callbackUrl；没有 Callback 配置时不会阻塞提交。
- `/webhooks/molizhishu` 能接收并保存完整结果。
- 重复 Callback 不会重复写入或重复触发下游业务。
- 后台轮询补偿能在无 Callback 或 Callback 失败时同步结果。
- 本地查询任务列表和详情不会调用远端接口。
- 手动同步才调用 `status/result`。
- 停止任务能调用远端停止接口，并保存 `stopped` 状态和已有子任务结果。
- `pageScreenshot` 空字符串、`recommendedQuestions: null`、`reasoningProcess: null` 等真实返回能被正确保存。
- 日志能清楚看出数据来源。
