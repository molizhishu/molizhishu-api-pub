---
id: get-subtask-result
title: 获取子任务结果
sidebar_position: 5
---

# 获取子任务结果

**接口地址:** `GET /task/result/{taskId}/{subTaskId}`

**接口描述:** 获取指定子任务的详细监控结果

**需要认证:** 是

## 请求参数

**路径参数:**

| 参数名 | 类型 | 位置 | 必需 | 描述 |
|--------|------|------|------|------|
| taskId | String | Path | 是 | 批量任务ID（UUID格式） |
| subTaskId | String | Path | 是 | 子任务ID |

## 响应结果

**成功响应（由于内容过长，answerContent已精简）:**
```json
{
    "success": true,
    "code": 200,
    "message": "操作成功",
    "data": {
        "subTaskId": "1037393",
        "platform": "yuanbao",
        "mode": "search",
        "prompt": "目前市场上销量较高的手机品牌有哪些",
        "status": "completed",
        "time": 1781080983000,
        "pageScreenshot": "https://img.molizhishu.com/screenshots/2026/06/10/504ed036c9cb446bb941ca35ee59568f_yuanbao_20260610_164249.png",
        "shareUrl": "https://yuanbao.tencent.com/s/xxxxxx",
        "answerContent": "结合2026年上半年的市场数据，目前市面上销量最稳、关注度最高的品牌主要集中在以下几个阵营，你可以根据自己的预算和偏好对号入座：...",
        "referenceList": [
            {
                "index": 1,
                "title": "华为Mate80累计销量近650万!可只及iPhone 17国内两成",
                "url": "https://new.qq.com/rain/a/20260610A03XXQ00",
                "summary": "大约是iPhone 17国内销售的两成,即使算上Pura80､Pura X2等机型,华为旗舰手机销量...",
                "publishTime": "2026-06-10",
                "site": "腾讯网",
                "icon": "icons/ddb169535e49d0bdbee77ba42dd570ce.ico"
            }
        ],
        "citationList": [
            {
                "index": 16,
                "title": "2026手机销量榜大结局:苹果华为高端对决,荣耀逆袭千元市场",
                "url": "https://post.smzdm.com/p/aggk9god",
                "publishTime": "2026-03-17",
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
        "searchKeywords": [
            "手机品牌销量排行 2026",
            "高端手机市场品牌对比"
        ],
        "mediaContent": [],
        "videoList": [
            {
                "videoPlatform": "douyin",
                "videoId": "7480000000000000000",
                "title": "2026上半年手机销量榜盘点：华为、苹果、小米谁更能打",
                "url": "https://www.douyin.com/video/7480000000000000000",
                "cover": "https://p3.douyinpic.com/aweme/cover_xxx.jpeg",
                "author": "科技数码评测",
                "duration": "05:23",
                "position": 1
            }
        ],
        "goods": [
            {
                "title": "小米 17 Pro 12GB+256GB 白色",
                "url": "https://item.jd.com/100278751428.html",
                "thumbnail": "https://img14.360buyimg.com/n1/jfs/t1/397871/33/15002/20525/00ae1e01e071a1e9.jpg",
                "price": "4999",
                "priceUnit": "¥",
                "mall": "京东",
                "mallPlatform": "jd",
                "mallProductId": "100278751428",
                "position": 1
            }
        ],
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
        "categoryRanking": {
            "categoryName": "高端手机品牌",
            "rank": 2,
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
                    "rank": 3
                }
            ]
        },
        "keywordEvaluations": [
            {
                "keyword": "影像体验出色",
                "nature": "positive",
                "context": "在国内高端市场极具号召力，影像与鸿蒙生态体验出色，是商务人士的首选之一。"
            },
            {
                "keyword": "商务人士首选",
                "nature": "positive",
                "context": "在国内高端市场极具号召力，影像与鸿蒙生态体验出色，是商务人士的首选之一。"
            }
        ]
    }
}
```

**响应字段说明:**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| subTaskId | String | 子任务ID |
| platform | String | AI平台 |
| mode | String | 监控模式 |
| prompt | String | 监控提示词 |
| status | String | 子任务状态 |
| time | Long | 完成时间戳（秒） |
| pageScreenshot | String | 页面截图 URL（如有），有效期为 180 天 |
| shareUrl | String | AI 平台官方对话分享链接（开启截图且平台支持时返回），详见 [商品/视频/搜索词/分享链接支持情况](./overview.md#商品视频搜索词分享链接支持情况) |
| answerContent | String | AI回答内容（Markdown格式） |
| referenceList | Array | 所有引用来源列表 |
| referenceList[].index | Integer | 引用索引 |
| referenceList[].title | String | 引用标题 |
| referenceList[].url | String | 引用链接 |
| referenceList[].summary | String | 文章摘要信息 |
| referenceList[].publishTime | String | 引用发布时间，格式：yyyy-MM-dd；未获取到发布时间时，返回 null 或空字符串 |
| referenceList[].site | String | 来源网站 |
| referenceList[].icon | String | 来源网站图标URL |
| citationList | Array | 答案中真实被引用的来源列表（referenceList的子集） |
| citationList[].index | Integer | 引用索引 |
| citationList[].title | String | 引用标题 |
| citationList[].url | String | 引用链接 |
| citationList[].publishTime | String | 引用发布时间，格式：yyyy-MM-dd；未获取到发布时间时，返回 null 或空字符串 |
| citationList[].site | String | 来源网站 |
| citationList[].icon | String | 来源网站图标URL |
| reasoningProcess | Object | 推理过程对象（如有） |
| reasoningProcess.summary | String | 推理摘要 |
| reasoningProcess.content | String | 完整推理内容 |
| recommendedQuestions | Array | 推荐追问列表（如有） |
| searchKeywords | Array&lt;String&gt; | 搜索词，各平台支持情况见 [商品/视频/搜索词/分享链接支持情况](./overview.md#商品视频搜索词分享链接支持情况) |
| mediaContent | Array | 多媒体内容（如有） |
| videoList | Array | 回答中展示的视频列表（如有），各平台支持情况见 [商品/视频/搜索词/分享链接支持情况](./overview.md#商品视频搜索词分享链接支持情况) |
| videoList[].videoPlatform | String | 视频来源平台，如抖音、哔哩哔哩、微信视频号 |
| videoList[].videoId | String | 视频编号 |
| videoList[].title | String | 视频标题或简介 |
| videoList[].url | String | 视频链接 |
| videoList[].cover | String | 视频封面链接 |
| videoList[].author | String | 视频作者或频道名称 |
| videoList[].duration | String | 视频时长 |
| videoList[].position | Integer | 视频展示顺序 |
| goods | Array | 回答中展示的商品列表（如有），各平台支持情况见 [商品/视频/搜索词/分享链接支持情况](./overview.md#商品视频搜索词分享链接支持情况) |
| goods[].title | String | 商品标题 |
| goods[].url | String | 商品详情链接 |
| goods[].thumbnail | String | 商品图片链接 |
| goods[].price | String | 商品价格 |
| goods[].priceUnit | String | 价格单位，如 ¥、元 |
| goods[].mall | String | 商城名称 |
| goods[].mallPlatform | String | 商品来源商城，如京东、天猫、淘宝 |
| goods[].mallProductId | String | 商品编号 |
| goods[].position | Integer | 商品展示顺序 |
| errorMessage | String | 错误信息（失败时） |
| proxyIp | String | IP地址 |
| amount | BigDecimal | 扣费金额 |
| mentionPosition | Integer | 本品提及位置（排名），null 表示未提及 |
| mentionContext | String | 本品提及上下文 |
| sentiment | String | 正负面评价（positive-正面、negative-负面、neutral-中性） |
| competitorRankings | Array | 竞品排名列表 |
| competitorRankings[].name | String | 竞品名称 |
| competitorRankings[].rank | Integer | 竞品排名位置，null 表示未提及 |
| allRankings | Array | 全部品牌排名列表（按 rank 排序） |
| allRankings[].name | String | 品牌名称 |
| allRankings[].rank | Integer | 品牌排名位置 |
| categoryRanking | Object | 本品最佳分类排名；没有分类排名时为 `null` |
| categoryRanking.categoryName | String | 分类名称 |
| categoryRanking.rank | Integer | 本品在该分类中的排名 |
| categoryRanking.allRankings | Array | 该分类下的全部品牌排名列表（按 rank 排序） |
| categoryRanking.allRankings[].name | String | 品牌名称 |
| categoryRanking.allRankings[].rank | Integer | 品牌在该分类中的排名位置 |
| keywordEvaluations | Array | 本品关键词评价分析列表；未获取到关键词评价时为空数组 `[]` |
| keywordEvaluations[].keyword | String | 关键词 |
| keywordEvaluations[].nature | String | 关键词性质：`positive`（正面）、`negative`（负面）、`neutral`（中性） |
| keywordEvaluations[].context | String | 关键词所在的回答上下文 |

**子任务状态值:**

| 状态值 | 描述                                                                                  |
|------|-------------------------------------------------------------------------------------|
| pending | 等待执行                                                                                |
| assigned | 已分配给执行节点                                                                            |
| processing | 处理中                                                                                 |
| completed | 完全完成（答案、截图、信源解析都完成）                                                                 |
| stopped | 已停止                                                                                 |
| failed | 失败（包括 `completed` 但未找到答案数据；未达到最大重试次数（默认任务失败后重试10次）前会展示为 `pending` 或 `processing`） |
| error | 错误                                                                                  |

## 子任务完成条件

子任务状态为 `completed` 需要满足：
- AI 回答内容生成完成
- 如需截图（`screenshot=1` 或 `screenshot=2`），截图已完成
- 如有引用来源，信源解析已完成
