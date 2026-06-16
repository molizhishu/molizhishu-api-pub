import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Hourglass,
  PlayCircle,
  RefreshCw,
  TimerReset,
  Trophy,
  XCircle,
  Zap
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api, TaskSummary } from '../api';
import { StatusBadge } from '../ui/StatusBadge';
import { AppSelect } from '../ui/AppSelect';
import { modeLabel, parseJsonArray, platformIcon, platformLabel } from '../molizhishuOptions';
import { formatDateTime, parseDateTime } from '../time';

type MetricTone = 'green' | 'blue' | 'orange' | 'red' | 'slate' | 'yellow';

type DashboardMetric = {
  label: string;
  value: string | number;
  tone: MetricTone;
  icon: typeof CheckCircle2;
  progress?: number;
};

type PlatformStat = {
  platform: string;
  modes: string[];
  total: number;
  completed: number;
  pending: number;
  running: number;
  partial: number;
  failed: number;
  stopped: number;
  completionRate: number;
};

const CHART_GREEN = '#22c55e';
const CHART_BLUE = '#3b82f6';
const CHART_ORANGE = '#f97316';
const CHART_RED = '#ef4444';

const UNFINISHED_STATUSES = ['pending', 'processing', 'partial_completed', 'failed', 'stopped'];
const TREND_COLORS = [
  CHART_GREEN,
  CHART_BLUE,
  CHART_ORANGE,
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#06b6d4',
  '#ef4444',
  '#64748b',
  '#a855f7'
];
const TREND_DASH_PATTERNS = ['', '', '', '', '8 4', '4 4', '10 4 2 4', '2 5', '12 5', '6 3 2 3'];

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 10000) / 100;
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function chartNumber(value: number): string {
  if (value >= 10000) return `${Math.round(value / 1000) / 10}w`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

function getTaskPrompt(task: TaskSummary): string {
  return parseJsonArray<string>(task.prompts_json)[0] || '-';
}

function getTaskPrompts(task: TaskSummary): string[] {
  return parseJsonArray<string>(task.prompts_json);
}

function getTaskPlatforms(task: TaskSummary) {
  return parseJsonArray<{ platform: string; mode: string }>(task.platforms_json);
}

function parseLocalDate(value?: string | null): Date | null {
  return parseDateTime(value);
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function dateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function taskDateInputValue(task: TaskSummary): string {
  const date = parseLocalDate(task.created_local_at) || parseLocalDate(task.updated_at);
  return date ? dateInputValue(date) : '';
}

function lastSevenDays(baseDate = new Date()) {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(baseDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return dateKey(date);
  });
}

function distribute(value: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.round(value / count));
}

function taskTotalItems(task: TaskSummary): number {
  return Number(task.total_items || 0);
}

function taskRemainingItems(task: TaskSummary): number {
  return Math.max(0, taskTotalItems(task) - Number(task.completed_items || 0) - Number(task.failed_items || 0));
}

function statusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待执行',
    processing: '执行中',
    completed: '已完成',
    partial_completed: '部分完成',
    failed: '失败',
    stopped: '已停止'
  };
  return map[status] || status;
}

function chartLabel(value: string): string {
  const map: Record<string, string> = {
    completed: '完成',
    pending: '待执行',
    failed: '失败',
    created: '创建量'
  };
  return map[value] || platformLabel(value);
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chartTooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.name}>
          <i style={{ background: item.color }} />
          {chartLabel(item.name)}：{compactNumber(Number(item.value || 0))}
        </span>
      ))}
    </div>
  );
}

function PlatformTrendLegend({ payload }: { payload?: Array<{ value?: string; color?: string }> }) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node | null;
      if (moreRef.current && target && !moreRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!payload?.length) return null;
  const visibleItems = payload.slice(0, 4);
  const hiddenItems = payload.slice(4);

  return (
    <div className="platformTrendLegend">
      {visibleItems.map((item) => {
        const value = item.value || '';
        return (
          <span className="platformTrendLegendItem" key={value} title={platformLabel(value)}>
            <i style={{ background: item.color }} />
            {platformIcon(value) && <img src={platformIcon(value)} alt="" />}
            <em>{platformLabel(value)}</em>
          </span>
        );
      })}
      {hiddenItems.length > 0 && (
        <div className="platformTrendMore" ref={moreRef}>
          <button type="button" className="platformTrendMoreTrigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            +{hiddenItems.length}
          </button>
          {open && (
            <div className="platformTrendMorePanel">
            {hiddenItems.map((item) => {
              const value = item.value || '';
              return (
                <span key={value} title={platformLabel(value)}>
                  <i style={{ background: item.color }} />
                  {platformIcon(value) && <img src={platformIcon(value)} alt="" />}
                  <em>{platformLabel(value)}</em>
                </span>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => dateInputValue(new Date()));
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => api.listTasks({ page: 1, size: 1000 }),
    refetchInterval: 15000
  });

  const items = data?.items ?? [];

  useEffect(() => {
    if (data) setUpdatedAt(new Date());
  }, [data]);

  const dashboard = useMemo(() => {
    const selectedDateValue = dateInputValue(parseDateInput(selectedDate));
    const scopedItems = items.filter((item) => taskDateInputValue(item) === selectedDateValue);
    const totalItems = scopedItems.reduce((sum, item) => sum + taskTotalItems(item), 0);
    const completedItems = scopedItems.reduce((sum, item) => sum + Number(item.completed_items || 0), 0);
    const failedItems = scopedItems.reduce((sum, item) => sum + Number(item.failed_items || 0), 0);
    const pendingItems = scopedItems
      .filter((item) => item.status === 'pending')
      .reduce((sum, item) => sum + taskRemainingItems(item), 0);
    const runningItems = scopedItems
      .filter((item) => item.status === 'processing')
      .reduce((sum, item) => sum + taskRemainingItems(item), 0);
    const partialItems = scopedItems
      .filter((item) => item.status === 'partial_completed')
      .reduce((sum, item) => sum + taskTotalItems(item), 0);
    const stoppedItems = scopedItems
      .filter((item) => item.status === 'stopped')
      .reduce((sum, item) => sum + taskRemainingItems(item), 0);
    const totalTasks = totalItems;
    const sampleTasks = scopedItems.length;
    const completedTasks = completedItems;
    const failedTasks = failedItems;
    const runningTasks = runningItems;
    const partialTasks = partialItems;
    const pendingTasks = pendingItems;
    const stoppedTasks = stoppedItems;
    const completionRate = percent(completedItems, totalItems);
    const days = lastSevenDays(parseDateInput(selectedDate));

    const platformMap = new Map<string, PlatformStat>();
    const dayMap = new Map(days.map((day) => [day, { day, completed: 0, pending: 0, failed: 0 }]));
    const hourMap = new Map(Array.from({ length: 24 }).map((_, hour) => [hour, { hour, completed: 0, created: 0 }]));

    scopedItems.forEach((task) => {
      const platforms = getTaskPlatforms(task);
      const prompts = getTaskPrompts(task);
      const platformCount = Math.max(platforms.length, 1);
      const promptCount = prompts.length || Math.max(1, Math.round(Number(task.total_items || 0) / platformCount));
      const perPlatformCompleted = distribute(Number(task.completed_items || 0), platformCount);
      const perPlatformFailed = distribute(Number(task.failed_items || 0), platformCount);

      platforms.forEach((item) => {
        const current = platformMap.get(item.platform) || {
          platform: item.platform,
          modes: [],
          total: 0,
          completed: 0,
          pending: 0,
          running: 0,
          partial: 0,
          failed: 0,
          stopped: 0,
          completionRate: 0
        };
        current.total += promptCount;
        current.completed += Math.min(promptCount, perPlatformCompleted);
        current.failed += Math.min(promptCount, perPlatformFailed);
        current.pending += task.status === 'pending' ? promptCount : 0;
        current.running += task.status === 'processing' ? promptCount : 0;
        current.partial += task.status === 'partial_completed' ? promptCount : 0;
        current.stopped += task.status === 'stopped' ? promptCount : 0;
        if (item.mode && !current.modes.includes(item.mode)) current.modes.push(item.mode);
        current.completionRate = percent(current.completed, current.total);
        platformMap.set(item.platform, current);
      });

      const created = parseLocalDate(task.created_local_at);
      if (created) {
        const hour = hourMap.get(created.getHours());
        if (hour) {
          hour.created += Number(task.total_items || 1);
          hour.completed += Number(task.completed_items || 0);
        }
      }
    });

    items.forEach((task) => {
      const updated = parseLocalDate(task.updated_at) || parseLocalDate(task.created_local_at);
      if (!updated) return;
      const key = dateKey(updated);
      const day = dayMap.get(key);
      if (!day) return;
      day.completed += Number(task.completed_items || 0);
      day.pending += Math.max(0, Number(task.total_items || 0) - Number(task.completed_items || 0) - Number(task.failed_items || 0));
      day.failed += Number(task.failed_items || 0);
    });

    const platforms = Array.from(platformMap.values())
      .map((item) => ({ ...item, pending: Math.max(0, item.pending) }))
      .sort((a, b) => b.total - a.total);

    const platformTrend = days.map((day) => {
      const row: Record<string, string | number> = { day };
      platforms.forEach((platform) => {
        row[platform.platform] = 0;
      });
      items.forEach((task) => {
        const key = dateKey(parseLocalDate(task.updated_at) || parseLocalDate(task.created_local_at) || new Date(0));
        if (key !== day) return;
        getTaskPlatforms(task).forEach((platform) => {
          if (selectedPlatform !== 'all' && platform.platform !== selectedPlatform) return;
          row[platform.platform] = Number(row[platform.platform] || 0) + distribute(Number(task.completed_items || 0), Math.max(getTaskPlatforms(task).length, 1));
        });
      });
      return row;
    });

    return {
      totalTasks,
      sampleTasks,
      completedTasks,
      failedTasks,
      runningTasks,
      partialTasks,
      pendingTasks,
      stoppedTasks,
      totalItems,
      completedItems,
      failedItems,
      pendingItems,
      completionRate,
      selectedDate: selectedDateValue,
      platforms,
      dayStats: Array.from(dayMap.values()),
      hourStats: Array.from(hourMap.values()),
      platformTrend,
      pressureTasks: [...scopedItems]
        .filter((task) => UNFINISHED_STATUSES.includes(task.status))
        .sort((a, b) => (b.total_items - b.completed_items - b.failed_items) - (a.total_items - a.completed_items - a.failed_items))
        .slice(0, 10),
      recentTasks: [...scopedItems]
        .sort((a, b) => (parseLocalDate(b.updated_at)?.getTime() || 0) - (parseLocalDate(a.updated_at)?.getTime() || 0))
        .slice(0, 10)
    };
  }, [items, selectedDate, selectedPlatform]);

  const metrics: DashboardMetric[] = [
    { label: '总任务', value: compactNumber(dashboard.totalTasks), tone: 'blue', icon: Clock3 },
    { label: '已完成', value: compactNumber(dashboard.completedTasks), tone: 'green', icon: CheckCircle2 },
    { label: '待执行', value: compactNumber(dashboard.pendingTasks), tone: 'yellow', icon: Hourglass },
    { label: '执行中', value: compactNumber(dashboard.runningTasks), tone: 'blue', icon: PlayCircle },
    { label: '部分完成', value: compactNumber(dashboard.partialTasks), tone: 'orange', icon: TimerReset },
    { label: '失败', value: compactNumber(dashboard.failedTasks), tone: 'red', icon: XCircle },
    { label: '已停止', value: compactNumber(dashboard.stoppedTasks), tone: 'slate', icon: Clock3 },
    { label: '完成率', value: `${dashboard.completionRate}%`, tone: 'green', icon: Zap, progress: dashboard.completionRate }
  ];

  const platformOptions = [
    { value: 'all', label: '全部平台' },
    ...dashboard.platforms.map((item) => ({ value: item.platform, label: platformLabel(item.platform), icon: platformIcon(item.platform) }))
  ];
  const trendLines = selectedPlatform === 'all' ? dashboard.platforms.map((item) => item.platform) : [selectedPlatform];
  const maxHourly = Math.max(0, ...dashboard.hourStats.map((item) => item.completed));

  return (
    <section className="page dashboardPage">
      <header className="opsHeader">
        <div className="opsTitle">
          <Activity size={22} />
          <h1>控制台</h1>
        </div>
        <div className="opsActions">
          <span className="opsUpdated">更新于 {updatedAt.toLocaleTimeString('zh-CN', { hour12: false })}<i /></span>
          <label className="opsDate" title="选择统计日期">
            <CalendarDays size={16} />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              aria-label="选择统计日期"
            />
          </label>
          <button className="outlineButton" type="button" onClick={() => refetch()}>
            <RefreshCw size={16} className={isFetching ? 'spinIcon' : ''} />
            刷新
          </button>
        </div>
      </header>

      <section className="opsSectionTitle">今日概览</section>
      <div className="opsMetricGrid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className={`opsMetric metric-${metric.tone}`} key={metric.label}>
              <div>
                <span>{metric.label}</span>
                <strong>{isLoading ? '-' : metric.value}</strong>
              </div>
              <Icon size={34} />
              {typeof metric.progress === 'number' && <i style={{ width: `${Math.min(metric.progress, 100)}%` }} />}
            </article>
          );
        })}
      </div>

      <div className="opsGrid">
        <div className="opsMainColumn">
          <section className="cardPanel opsPanel modelAnalysisPanel">
            <div className="opsPanelHeader">
              <h2>模型任务分析</h2>
              <button className="iconOnlyButton" type="button" onClick={() => refetch()} title="刷新模型任务分析">
                <RefreshCw size={17} className={isFetching ? 'spinIcon' : ''} />
              </button>
            </div>
            <div className="opsTableScroller">
              <table className="opsAnalysisTable">
                <thead>
                  <tr>
                    <th>模型</th>
                    <th>总数</th>
                    <th>已完成</th>
                    <th>未完成</th>
                    <th>待执行</th>
                    <th>执行中</th>
                    <th>部分完成</th>
                    <th>失败</th>
                    <th>已停止</th>
                    <th>完成率</th>
                    <th>进度</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.platforms.map((item) => (
                    <tr key={item.platform}>
                      <td>
                        <span className="opsPlatformName">
                          {platformIcon(item.platform) && <img src={platformIcon(item.platform)} alt="" />}
                          {platformLabel(item.platform)}
                        </span>
                      </td>
                      <td>{compactNumber(item.total)}</td>
                      <td className="textGreen">{compactNumber(item.completed)}</td>
                      <td className="textOrange">{compactNumber(Math.max(0, item.total - item.completed))}</td>
                      <td className="textOrange">{compactNumber(item.pending)}</td>
                      <td className="textBlue">{compactNumber(item.running)}</td>
                      <td className="textOrange">{compactNumber(item.partial)}</td>
                      <td className="textRed">{compactNumber(item.failed)}</td>
                      <td className="textSlate">{compactNumber(item.stopped)}</td>
                      <td>{item.completionRate}%</td>
                      <td>
                        <span className="opsProgress"><i style={{ width: `${Math.min(item.completionRate, 100)}%` }} /></span>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && dashboard.platforms.length === 0 && (
                    <tr><td colSpan={11} className="emptyCell">暂无模型任务数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="cardPanel opsPanel hourlyPanel">
            <div className="opsPanelHeader">
              <h2><Clock3 size={15} /> 每小时任务统计</h2>
              <button className="iconOnlyButton" type="button" onClick={() => refetch()} title="刷新每小时任务统计">
                <RefreshCw size={17} className={isFetching ? 'spinIcon' : ''} />
              </button>
            </div>
            <div className="opsChart tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.hourStats} margin={{ top: 24, right: 12, bottom: 0, left: -18 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="hour" ticks={[0, 6, 12, 18, 23]} tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(value) => chartNumber(Number(value))} domain={[0, Math.max(maxHourly, 1)]} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Bar dataKey="completed" name="完成量" fill={CHART_GREEN} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="completed" position="top" formatter={(value: number) => (value ? chartNumber(value) : '')} style={{ fontSize: 11, fill: '#94a3b8' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="opsChartFooter">
              <span>总计 {compactNumber(dashboard.completedItems)} 条</span>
              <span>峰值 {compactNumber(maxHourly)}</span>
            </div>
          </section>

          <section className="cardPanel opsPanel recentTaskPanel">
            <div className="opsPanelHeader">
              <h2><Flame size={15} /> 近期任务</h2>
              <button className="iconOnlyButton" type="button" onClick={() => refetch()} title="刷新近期任务">
                <RefreshCw size={17} className={isFetching ? 'spinIcon' : ''} />
              </button>
            </div>
            <div className="tableScroller dashboardRecentScroller">
              <table className="adminTable dashboardRecentTable">
                <thead>
                  <tr>
                    <th>任务 ID</th>
                    <th>提示词</th>
                    <th>平台</th>
                    <th>模式</th>
                    <th className="centerCell">状态</th>
                    <th className="centerCell">进度</th>
                    <th>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentTasks.map((task) => {
                    const prompts = parseJsonArray<string>(task.prompts_json);
                    const platforms = getTaskPlatforms(task);
                    const platformPreview = platforms.slice(0, 3);
                    const modePreview = Array.from(new Set(platforms.map((item) => item.mode)));
                    return (
                      <tr key={task.task_id}>
                        <td>
                          <Link className="taskLink monoText" to={`/tasks/${task.task_id}`} title={task.task_id}>
                            {task.task_id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="truncateCell" title={prompts.join('\n')}>
                          <div className="promptCell">{prompts[0] || '-'}</div>
                          {prompts.length > 1 && <div className="muted">共 {prompts.length} 条</div>}
                        </td>
                        <td>
                          <div className="platformChips">
                            {platformPreview.map((item) => (
                              <span className="platformChip" key={item.platform}>
                                {platformIcon(item.platform) && <img src={platformIcon(item.platform)} alt="" />}
                                {platformLabel(item.platform)}
                              </span>
                            ))}
                            {platforms.length > platformPreview.length && <span className="muted">+{platforms.length - platformPreview.length}</span>}
                          </div>
                        </td>
                        <td className="muted">{modePreview.map(modeLabel).join('、') || '-'}</td>
                        <td className="centerCell"><StatusBadge status={task.status} /></td>
                        <td className="centerCell">
                          <span className="progressText">{task.completed_items}/{task.total_items}</span>
                          {task.failed_items > 0 && <span className="failText">失败 {task.failed_items}</span>}
                        </td>
                        <td className="muted">{formatDateTime(task.updated_at)}</td>
                      </tr>
                    );
                  })}
                  {!isLoading && dashboard.recentTasks.length === 0 && (
                    <tr><td colSpan={7} className="emptyCell">暂无近期任务</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="opsSideColumn">
          <section className="cardPanel opsPanel">
            <div className="opsPanelHeader">
              <h2><Activity size={15} /> 模型任务统计</h2>
              <div className="opsPanelTools">
                <AppSelect value={selectedPlatform} onChange={setSelectedPlatform} options={platformOptions} ariaLabel="选择平台" />
                <button className="iconOnlyButton" type="button" onClick={() => refetch()} title="刷新模型任务统计">
                  <RefreshCw size={17} className={isFetching ? 'spinIcon' : ''} />
                </button>
              </div>
            </div>
            <div className="opsChart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.platformTrend} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(value) => chartNumber(Number(value))} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Legend verticalAlign="bottom" content={<PlatformTrendLegend />} />
                  {trendLines.map((platform, index) => (
                    <Line
                      key={platform}
                      type="monotone"
                      dataKey={platform}
                      name={platform}
                      stroke={TREND_COLORS[index % TREND_COLORS.length]}
                      strokeWidth={3}
                      strokeDasharray={TREND_DASH_PATTERNS[index % TREND_DASH_PATTERNS.length] || undefined}
                      strokeDashoffset={index * 3}
                      dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="cardPanel opsPanel">
            <div className="opsPanelHeader">
              <h2><BarChart3 size={15} /> 近 7 天任务完成统计</h2>
              <button className="iconOnlyButton" type="button" onClick={() => refetch()} title="刷新近 7 天统计">
                <RefreshCw size={17} className={isFetching ? 'spinIcon' : ''} />
              </button>
            </div>
            <div className="opsChart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.dayStats} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(value) => chartNumber(Number(value))} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="completed" name="完成" stroke={CHART_GREEN} strokeWidth={3} dot={{ r: 3, fill: '#ffffff' }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="pending" name="待执行" stroke={CHART_ORANGE} strokeWidth={2} dot={{ r: 3, fill: '#ffffff' }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="failed" name="失败" stroke={CHART_RED} strokeWidth={2} dot={{ r: 3, fill: '#ffffff' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="cardPanel opsPanel pressurePanel">
            <div className="opsPanelHeader">
              <h2><Trophy size={15} /> 任务积压 Top 10</h2>
              <button className="iconOnlyButton" type="button" onClick={() => refetch()} title="刷新任务积压">
                <RefreshCw size={17} className={isFetching ? 'spinIcon' : ''} />
              </button>
            </div>
            {dashboard.pressureTasks.length > 0 ? (
              <div className="opsPressureList">
                {dashboard.pressureTasks.map((task, index) => {
                  const pending = Math.max(0, task.total_items - task.completed_items - task.failed_items);
                  const platforms = getTaskPlatforms(task);
                  return (
                    <Link to={`/tasks/${task.task_id}`} className="opsPressureItem" key={task.task_id}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{getTaskPrompt(task)}</strong>
                        <em>{task.task_id.slice(0, 8)} · {platforms.map((item) => platformLabel(item.platform)).join('、') || '-'}</em>
                      </div>
                      <b>{compactNumber(pending)}</b>
                      <StatusBadge status={task.status} />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <table className="opsEmptyTable">
                <thead>
                  <tr>
                    <th>任务</th>
                    <th>平台</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3}>
                      <div className="opsPressureEmpty">
                        <CheckCircle2 size={26} />
                        <strong>当前没有未完成的任务</strong>
                        <span>所有监控任务都已完成，暂无需要处理的积压项。</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
