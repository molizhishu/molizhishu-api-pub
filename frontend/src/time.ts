export const APP_TIME_ZONE = 'Asia/Shanghai';

type TimeInput = Date | number | string | null | undefined;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localParts(value: string): RegExpMatchArray | null {
  return value
    .trim()
    .replace('T', ' ')
    .match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
}

function hasExplicitTimeZone(value: string): boolean {
  return /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value.trim());
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23'
  }).format(date);
}

export function formatDateTime(value: TimeInput, fallback = '-'): string {
  if (value == null || value === '') return fallback;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? fallback : formatDate(value);
  if (typeof value === 'number') return Number.isFinite(value) ? formatDate(new Date(value)) : fallback;

  const text = String(value).trim();
  if (!text) return fallback;

  if (/^\d{12,}$/.test(text)) {
    return formatDate(new Date(Number(text)));
  }

  const local = hasExplicitTimeZone(text) ? null : localParts(text);
  if (local) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = local;
    return `${year}/${pad(Number(month))}/${pad(Number(day))} ${pad(Number(hour))}:${pad(Number(minute))}:${pad(Number(second))}`;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : formatDate(parsed);
}

export function parseDateTime(value: TimeInput): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return Number.isFinite(value) ? new Date(value) : null;

  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{12,}$/.test(text)) return new Date(Number(text));

  const local = hasExplicitTimeZone(text) ? null : localParts(text);
  if (local) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = local;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
