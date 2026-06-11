import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleStop, Copy, Eye, Loader2, Plus, RadioTower, RefreshCw, Search } from 'lucide-react';
import { api } from '../api';
import type { TaskSummary } from '../api';
import { StatusBadge } from '../ui/StatusBadge';
import { AppSelect } from '../ui/AppSelect';
import { modeLabel, parseJsonArray, platformIcon, platformLabel } from '../molizhishuOptions';

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: 'pending' },
  { value: 'processing', label: 'processing' },
  { value: 'completed', label: 'completed' },
  { value: 'partial_completed', label: 'partial_completed' },
  { value: 'failed', label: 'failed' },
  { value: 'stopped', label: 'stopped' }
];

const stoppableStatuses = new Set(['pending', 'processing']);

function TaskIdCell({ taskId }: { taskId: string }) {
  const [copied, setCopied] = useState(false);
  const shortId = taskId.slice(0, 8);

  const copyTaskId = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(taskId);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = taskId;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [taskId]);

  return (
    <span className="taskIdCell">
      <Link className="taskLink monoText" to={`/tasks/${taskId}`} title={taskId}>
        {shortId}
      </Link>
      <button
        className="copyRevealButton"
        type="button"
        onClick={copyTaskId}
        title={copied ? '已复制' : '复制完整任务 ID'}
        aria-label="复制完整任务 ID"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </span>
  );
}

export function TaskListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [stopError, setStopError] = useState('');
  const pageSize = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tasks', page, status],
    queryFn: () => api.listTasks({ page, size: pageSize, status: status || undefined }),
    refetchInterval: 15000
  });

  const stopMutation = useMutation({
    mutationFn: (taskId: string) => api.stopTask(taskId),
    onMutate: () => setStopError(''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetch();
    },
    onError: (error: Error) => {
      setStopError(error.message || '停止任务失败');
    }
  });

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter((task) =>
      [task.task_id, task.status, task.callback_url ?? '', task.updated_at, task.prompts_json, task.platforms_json]
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [data?.items, keyword]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  function handleStopTask(task: TaskSummary) {
    if (!stoppableStatuses.has(task.status)) {
      setStopError('只有等待中或执行中的任务可以停止');
      return;
    }

    const confirmed = window.confirm('确认停止该监控任务？已完成的子任务结果会保留，未完成的子任务将不再继续调度。');
    if (!confirmed) {
      return;
    }

    stopMutation.mutate(task.task_id);
  }

  return (
    <section className="page">
      <header className="pageHeader">
        <div className="titleRow">
          <RadioTower className="titleIcon" size={22} />
          <h1>监控任务</h1>
        </div>
        <div className="pageSubtitle">
          <p>这里只读取本地数据库，不主动调用模力指数接口。</p>
        </div>
      </header>

      <div className="cardPanel toolbarPanel">
        <div className="searchBox">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索任务 ID / 状态 / Callback..."
          />
        </div>
        <AppSelect
          className="selectCompact"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={statusOptions}
          ariaLabel="状态筛选"
        />
        <button className="ghostButton" onClick={() => refetch()} title="刷新">
          <RefreshCw size={16} />
        </button>
        <Link className="primaryButton compactAction" to="/tasks/new">
          <Plus size={16} />
          新建任务
        </Link>
      </div>
      {stopError && <div className="error taskListError">{stopError}</div>}

      <div className="cardPanel tablePanel">
        <div className="tableScroller">
          <table className="adminTable">
            <thead>
              <tr>
                <th>任务 ID</th>
                <th>提示词</th>
                <th>平台</th>
                <th>模式</th>
                <th className="centerCell">状态</th>
                <th className="centerCell">进度</th>
                <th>更新时间</th>
                <th className="rightCell">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="emptyCell">加载中...</td>
                </tr>
              )}
              {!isLoading && filteredItems.map((task) => {
                const prompts = parseJsonArray<string>(task.prompts_json);
                const platforms = parseJsonArray<{ platform: string; mode: string }>(task.platforms_json);
                const platformPreview = platforms.slice(0, 3);
                const modePreview = Array.from(new Set(platforms.map((item) => item.mode)));

                return (
                  <tr key={task.task_id}>
                    <td>
                      <TaskIdCell taskId={task.task_id} />
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
                    <td className="centerCell">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="centerCell">
                      <span className="progressText">{task.completed_items}/{task.total_items}</span>
                      {task.failed_items > 0 && <span className="failText">失败 {task.failed_items}</span>}
                    </td>
                    <td className="muted">{task.updated_at}</td>
                    <td className="rightCell">
                      <div className="rowActions">
                        {stoppableStatuses.has(task.status) && (
                          <button
                            className="tableActionButton stopActionButton"
                            type="button"
                            onClick={() => handleStopTask(task)}
                            disabled={stopMutation.isPending && stopMutation.variables === task.task_id}
                            title="停止任务"
                            aria-label="停止任务"
                          >
                            {stopMutation.isPending && stopMutation.variables === task.task_id ? (
                              <Loader2 className="spinIcon" size={16} />
                            ) : (
                              <CircleStop size={16} />
                            )}
                          </button>
                        )}
                      <Link className="tableActionButton viewActionButton" to={`/tasks/${task.task_id}`} title="查看详情" aria-label="查看详情">
                        <Eye size={16} />
                      </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="emptyCell">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>共 {data?.total ?? 0} 条 · 第 {page}/{totalPages} 页</span>
          <div>
            <button className="outlineButton" disabled={page === 1} onClick={() => setPage(1)}>首页</button>
            <button className="outlineButton" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
            <button className="outlineButton" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button>
            <button className="outlineButton" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>末页</button>
          </div>
        </div>
      </div>
    </section>
  );
}
