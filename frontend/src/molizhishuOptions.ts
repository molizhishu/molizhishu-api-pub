export const platformOptions = [
  {
    value: 'deepseek',
    label: 'DeepSeek',
    description: '领先的国产自研大模型，性能强劲。',
    icon: 'https://doc.molizhishu.com/images/svg/deepseek-color.svg'
  },
  {
    value: 'doubao',
    label: '豆包',
    description: '字节跳动旗下的智能 AI 助手。',
    icon: 'https://doc.molizhishu.com/images/svg/doubao-color.svg'
  },
  {
    value: 'yuanbao',
    label: '元宝',
    description: '腾讯出品的 AI 助手，连接微信生态。',
    icon: 'https://doc.molizhishu.com/images/svg/yuanbao-color.svg'
  },
  {
    value: 'kimi',
    label: 'Kimi',
    description: '月之暗面出品，支持长文本处理。',
    icon: 'https://doc.molizhishu.com/images/svg/kimi-color.svg'
  },
  {
    value: 'qianwen',
    label: '通义千问',
    description: '阿里巴巴自研大模型，功能全面。',
    icon: 'https://doc.molizhishu.com/images/svg/qwen-color.svg'
  },
  {
    value: 'quark',
    label: '夸克',
    description: '夸克浏览器内置 AI，主打搜索与学习。',
    icon: 'https://doc.molizhishu.com/images/svg/quark-color.svg'
  },
  {
    value: 'baiduai',
    label: '百度 AI+',
    description: '百度推出的 AI 搜索。',
    icon: 'https://doc.molizhishu.com/images/svg/baidu-color.svg'
  },
  {
    value: 'weibo_zhisou',
    label: '微博智搜',
    description: '微博推出的 AI 搜索。',
    icon: 'https://doc.molizhishu.com/images/svg/weibo-color.svg'
  },
  {
    value: 'wenxinyiyan',
    label: '文心一言',
    description: '百度旗下大语言模型，深度整合百度生态。',
    icon: 'https://doc.molizhishu.com/images/svg/wenxin-color.svg'
  },
  {
    value: 'doubao_mobile',
    label: '豆包移动版',
    description: '字节跳动豆包移动端版本。',
    icon: 'https://doc.molizhishu.com/images/svg/doubao-color.svg'
  }
] as const;

export const modeOptions = [
  { value: 'standard', label: '标准模式' },
  { value: 'reasoning', label: '深度思考' },
  { value: 'search', label: '联网搜索' },
  { value: 'reasoning_search', label: '深度思考 + 联网搜索' }
] as const;

export const screenshotOptions = [
  { value: 0, label: '不截图' },
  { value: 1, label: '截图' },
  { value: 2, label: '提及截图' }
] as const;

export function platformLabel(value: string | null | undefined): string {
  return platformOptions.find((item) => item.value === value)?.label || value || '-';
}

export function platformIcon(value: string | null | undefined): string | undefined {
  return platformOptions.find((item) => item.value === value)?.icon;
}

export function modeLabel(value: string | null | undefined): string {
  return modeOptions.find((item) => item.value === value)?.label || value || '-';
}

export function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
