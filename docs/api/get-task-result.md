---
id: get-task-result
title: 获取任务结果
sidebar_position: 4
---

# 获取任务结果

**接口地址:** `GET /task/result/{taskId}`

**接口描述:** 获取批量任务的完整结果信息，包含所有子任务的详细数据

**需要认证:** 是

## 请求参数

**路径参数:**

| 参数名 | 类型 | 位置 | 必需 | 描述 |
|--------|------|------|------|------|
| taskId | String | Path | 是 | 批量任务ID（UUID格式） |

## 响应结果

**成功响应（示例已精简，实际返回包含完整answerContent）:**
```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "taskId": "5a85cdd0ed9249cfb69daaeca2b91a09",
        "status": "completed",
        "totalItems": 2,
        "completedItems": 2,
        "failedItems": 0,
        "subTaskList": [ 
            {
                "subTaskId": "1037393",
                "platform": "yuanbao",
                "mode": "search",
                "prompt": "目前市场上销量较高的手机品牌有哪些",
                "status": "completed",
                "time": 1781080983000,
                "pageScreenshot": "https://img.molizhishu.com/screenshots/2026/06/10/504ed036c9cb446bb941ca35ee59568f_yuanbao_20260610_164249.png",
                "answerContent": "结合2026年上半年的市场数据，目前市面上销量最稳、关注度最高的品牌主要集中在以下几个阵营， ...",
                "referenceList": [
                    {
                        "index": 1,
                        "title": "华为Mate80累计销量近650万!可只及iPhone 17国内两成",
                        "url": "https://new.qq.com/rain/a/20260610A03XXQ00",
                        "summary": "大约是iPhone 17国内销售的两成,即使算上Pura80､Pura X2等机型,华为旗舰手机销量...",
                        "site": "腾讯网",
                        "icon": "icons/ddb169535e49d0bdbee77ba42dd570ce.ico"
                    } 
                ],
                "citationList": [
                    {
                        "index": 16,
                        "title": "2026手机销量榜大结局:苹果华为高端对决,荣耀逆袭千元市场",
                        "url": "https://post.smzdm.com/p/aggk9god",
                        "site": "什么值得买",
                        "icon": "icons/8f67abc6859d51a0b9922b3de42312ba.ico"
                    } 
                ],
                "reasoningProcess": {
                    "summary": "",
                    "content": "用户想了解市场销量较高的手机品牌，我会搜索最新手机市场销量数据，以此给出准确答复。"
                },
                "recommendedQuestions": [
                    "哪些手机品牌口碑最好？",
                    "2026年手机销量排行榜前十名有哪些变化？",
                    "苹果和华为在高端市场的具体差异是什么？"
                ],
                "mediaContent": [],
                "errorMessage": null,
                "proxyIp": null,
                "amount": 0.18,
                "mentionPosition": 2,
                "mentionContext": "在国内高端市场极具号召力，影像与鸿蒙生态体验出色，是商务人士的首选之一。",
                "sentiment": "positive",
                "competitorRankings": [
                    {
                        "name": "苹果",
                        "rank": 1
                    },
                    {
                        "name": "小米",
                        "rank": 6
                    }
                ],
                "allRankings": [
                    {
                        "name": "苹果",
                        "rank": 1
                    },
                    {
                        "name": "华为",
                        "rank": 2
                    },
                    {
                        "name": "小米",
                        "rank": 6
                    }
                ],
                "keywordEvaluations": []
            }
        ]
    }
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| taskId | String | 批量任务ID |
| status | String | 任务状态，详见[查询任务状态](./query-task-status) |
| totalItems | Integer | 子任务总数 |
| completedItems | Integer | 已完成数量 |
| failedItems | Integer | 失败数量 |
| subTaskList | Array | 子任务结果列表，结构与[获取子任务结果](./get-subtask-result)接口一致 |
| subTaskList[].subTaskId | String | 子任务ID |
| subTaskList[].platform | String | AI平台 |
| subTaskList[].mode | String | 监控模式 |
| subTaskList[].prompt | String | 监控提示词 |
| subTaskList[].status | String | 子任务状态，详见[获取子任务结果](./get-subtask-result) |
| subTaskList[].monitorKeywords | String | 监控关键词 |
| subTaskList[].monitorKeywordAliases | List&lt;String&gt; | 监控词别名列表 |
| subTaskList[].competitors | Array | 竞品词列表（含别名） |
| subTaskList[].competitors[].name | String | 竞品名称 |
| subTaskList[].competitors[].aliases | List&lt;String&gt; | 竞品别名列表 |
| subTaskList[].time | Long | 完成时间戳（秒） |
| subTaskList[].pageScreenshot | String | 页面截图URL（如有） |
| subTaskList[].answerContent | String | AI回答内容（Markdown格式） |
| subTaskList[].referenceList | Array | 所有引用来源列表 |
| subTaskList[].referenceList[].index | Integer | 引用索引 |
| subTaskList[].referenceList[].title | String | 引用标题 |
| subTaskList[].referenceList[].url | String | 引用链接 |
| subTaskList[].referenceList[].summary | String | 文章摘要信息 |
| subTaskList[].referenceList[].site | String | 来源网站 |
| subTaskList[].referenceList[].icon | String | 来源网站图标URL |
| subTaskList[].citationList | Array | 答案中真实被引用的来源列表（referenceList的子集） |
| subTaskList[].reasoningProcess | Object | 推理过程对象（如有） |
| subTaskList[].reasoningProcess.summary | String | 推理摘要 |
| subTaskList[].reasoningProcess.content | String | 完整推理内容 |
| subTaskList[].recommendedQuestions | Array | 推荐追问列表（如有） |
| subTaskList[].mediaContent | Array | 多媒体内容（如有） |
| subTaskList[].errorMessage | String | 错误信息（失败时） |
| subTaskList[].proxyIp | String | IP地址 |
| subTaskList[].amount | BigDecimal | 扣费金额 |
| subTaskList[].mentionPosition | Integer | 本品提及位置（排名），null 表示未提及 |
| subTaskList[].mentionContext | String | 本品提及上下文 |
| subTaskList[].sentiment | String | 正负面评价（positive-正面、negative-负面、neutral-中性） |
| subTaskList[].competitorRankings | Array | 竞品排名列表 |
| subTaskList[].competitorRankings[].name | String | 竞品名称 |
| subTaskList[].competitorRankings[].rank | Integer | 竞品排名位置，null 表示未提及 |
| subTaskList[].allRankings | Array | 全部品牌排名列表（按 rank 排序） |
| subTaskList[].allRankings[].name | String | 品牌名称 |
| subTaskList[].allRankings[].rank | Integer | 品牌排名位置 |
| subTaskList[].keywordEvaluations | Array | 关键词评价分析列表（**暂未实现**，当前返回值始终为空数组 `[]`） |
| subTaskList[].keywordEvaluations[].keyword | String | 关键词 |
| subTaskList[].keywordEvaluations[].nature | String | 关键词性质（正面/负面/中性） |
| subTaskList[].keywordEvaluations[].context | String | 关键词所在上下文 |
