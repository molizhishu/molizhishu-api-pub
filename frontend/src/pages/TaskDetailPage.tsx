import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Check, ChevronDown, ChevronRight, Clock3, Copy, ExternalLink, Image as ImageIcon, RefreshCw, RadioTower, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Subtask, TaskDetail } from '../api';
import { StatusBadge } from '../ui/StatusBadge';
import { MarkdownContent } from '../ui/MarkdownContent';
import { AppSelect } from '../ui/AppSelect';
import { modeLabel, parseJsonArray, platformIcon, platformLabel } from '../molizhishuOptions';

type ReferenceItem = {
  url: string;
  icon?: string;
  site?: string;
  index?: number;
  title?: string;
};

type MediaItem = string | { type?: string; url?: string; title?: string; desc?: string };

const ICON_BASE_URL = 'https://img.molizhishu.com/';
const SUBTASK_PAGE_SIZE = 25;

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeIconUrl(icon?: string | null): string | undefined {
  if (!icon) return undefined;
  if (/^https?:\/\//i.test(icon)) return icon;
  return ICON_BASE_URL + icon.replace(/^\/+/, '');
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function uniqueReferences(...groups: ReferenceItem[][]): ReferenceItem[] {
  const map = new Map<number, ReferenceItem>();
  groups.flat().forEach((ref) => {
    if (typeof ref.index === 'number' && !map.has(ref.index)) {
      map.set(ref.index, ref);
    }
  });
  return Array.from(map.values());
}

function normalizeMarkdownContent(content: unknown): string {
  if (content == null) return '';
  if (typeof content === 'string') return content === 'null' ? '' : content;
  if (Array.isArray(content)) {
    return content.map((item) => normalizeMarkdownContent(item)).filter(Boolean).join('\n\n');
  }
  if (typeof content === 'object') {
    const value = content as Record<string, unknown>;
    const candidates = [
      value.content,
      value.text,
      value.reasoning,
      value.reasoningContent,
      value.reasoningProcess,
      value.markdown,
      value.message
    ];
    const matched = candidates.find((item) => typeof item === 'string' && item.trim() !== '');
    if (matched) return matched as string;
    return JSON.stringify(content, null, 2);
  }
  return String(content);
}

function enrichCitations(content: unknown, references: ReferenceItem[]): string {
  const markdownContent = normalizeMarkdownContent(content);
  if (!markdownContent) return '';
  const refMap = new Map<number, ReferenceItem>();
  references.forEach((ref) => {
    if (typeof ref.index === 'number') {
      refMap.set(ref.index, ref);
    }
  });
  const orderedReferences = [...references].sort((a, b) => (a.index || 0) - (b.index || 0));

  return markdownContent.replace(/\[citation:(\d+)]/g, (full, indexText) => {
    const citationIndex = Number(indexText);
    const ref = refMap.get(citationIndex)
      || (citationIndex > orderedReferences.length ? orderedReferences[orderedReferences.length - 1] : orderedReferences[citationIndex - 1]);
    if (!ref?.url) {
      return `<span class="citationLink citationMissing" title="未返回 citation:${htmlEscape(indexText)} 的来源信息">来源${htmlEscape(indexText)}</span>`;
    }
    const label = ref.site || ref.title || `来源 ${indexText}`;
    return `<a class="citationLink" href="${htmlEscape(ref.url)}" target="_blank" rel="noreferrer noopener">${htmlEscape(label)}</a>`;
  });
}

function renderJsonText(value: unknown): string {
  if (value == null) return '-';
  if (typeof value === 'string') return value || '-';
  return JSON.stringify(value, null, 2);
}

function HighlightedJson({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const json = renderJsonText(value);
  const parts = json.split(/("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rawJsonPanel">
      <div className="rawJsonToolbar">
        <span>JSON</span>
        <button type="button" onClick={copyJson} title={copied ? '已复制' : '复制原始结果'}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="rawJsonBlock">
        {parts.map((part, index) => {
          let className = '';
          if (/^"(?:\\.|[^"\\])*"$/.test(part)) {
            className = json.slice(json.indexOf(part) + part.length).trimStart().startsWith(':') ? 'jsonKey' : 'jsonString';
          } else if (/^(true|false)$/.test(part)) {
            className = 'jsonBoolean';
          } else if (part === 'null') {
            className = 'jsonNull';
          } else if (/^-?\d/.test(part)) {
            className = 'jsonNumber';
          }
          return className ? <span className={className} key={index}>{part}</span> : <span key={index}>{part}</span>;
        })}
      </pre>
    </div>
  );
}

function subtaskReferences(subtask: Subtask) {
  const referenceList = parseJsonArray<ReferenceItem>(subtask.reference_list_json);
  const citationList = parseJsonArray<ReferenceItem>(subtask.citation_list_json);
  return { referenceList, citationList };
}

function formatRemoteTime(value?: string | null): string {
  if (!value) return '-';
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function callbackInfo(event: TaskDetail['callbackEvents'][number]) {
  const payload = parseJson<Record<string, unknown>>(event.payload_json, {});
  const ip = String(payload.ip || payload.clientIp || payload.remoteIp || '-');
  return {
    status: String(payload.status || event.process_status),
    ip,
    taskId: String(payload.taskId || event.task_id || '-'),
    subtaskCount: Array.isArray(payload.subTaskList) ? payload.subTaskList.length : 0
  };
}

function SourceList({ title, items }: { title: string; items: ReferenceItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, 10);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <section className="subtaskSupplement">
      <div className="sourceHeader">
        <h3>{title}</h3>
        {items.length > 10 && <span>共 {items.length} 条</span>}
      </div>
      <div className="sourceList">
        {visibleItems.map((ref) => (
          <a key={`${ref.index}-${ref.url}`} href={ref.url} target="_blank" rel="noreferrer" className="sourceItem">
            {normalizeIconUrl(ref.icon) ? <img src={normalizeIconUrl(ref.icon)} alt="" /> : <span className="sourceIconFallback">{ref.site?.slice(0, 1) || '源'}</span>}
            <div className="sourceText">
              <strong>{ref.site || '未知站点'}</strong>
              <span>-</span>
              <em>{ref.title || ref.url}</em>
            </div>
            <ExternalLink size={14} />
          </a>
        ))}
        {items.length === 0 && <p className="muted">暂无数据</p>}
        {items.length > 10 && (
          <button className="sourceMoreButton" type="button" onClick={() => setShowAll((value) => !value)}>
            {showAll ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {showAll ? '收起列表' : `展开全部，剩余 ${hiddenCount} 条`}
          </button>
        )}
      </div>
    </section>
  );
}

function ReasoningPanel({ content, references }: { content: unknown; references: ReferenceItem[] }) {
  const [expanded, setExpanded] = useState(true);
  const markdownContent = normalizeMarkdownContent(content);
  if (!markdownContent) {
    return <p className="muted">暂无数据</p>;
  }

  return (
    <div className="reasoningPanel">
      <button
        className="reasoningHeader"
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <BrainCircuit size={16} />
        <span>深度思考</span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {expanded && <MarkdownContent content={enrichCitations(markdownContent, references)} className="reasoningMarkdown" />}
    </div>
  );
}

function RecommendedQuestionList({ questions }: { questions: string[] }) {
  if (questions.length === 0) {
    return <p className="muted">暂无数据</p>;
  }

  return (
    <div className="recommendedQuestionList">
      {questions.map((question, questionIndex) => (
        <div className="recommendedQuestionItem" key={`${question}-${questionIndex}`}>
          <span>{questionIndex + 1}</span>
          <p>{question}</p>
        </div>
      ))}
    </div>
  );
}

function ScreenshotPreview({ url }: { url: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <>
      <button className="screenshotButton" type="button" onClick={() => setOpen(true)}>
        <ImageIcon size={14} />
        查看截图
      </button>
      {open && (
        <div className="screenshotLightbox" onClick={() => setOpen(false)}>
          <div className="screenshotDialog" onClick={(event) => event.stopPropagation()}>
            <div className="screenshotHeader">
              <strong>页面截图</strong>
              <button type="button" onClick={() => setOpen(false)} aria-label="关闭截图">
                <X size={18} />
              </button>
            </div>
            <div className="screenshotBody">
              <img src={url} alt="页面截图" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubtaskPanel({ item, index, expanded, onToggle }: {
  item: Subtask;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { referenceList, citationList } = subtaskReferences(item);
  const citationReferences = uniqueReferences(referenceList, citationList);
  const reasoning = parseJson<unknown>(item.reasoning_process_json, null);
  const recommendedQuestions = parseJsonArray<string>(item.recommended_questions_json);
  const mediaContent = parseJsonArray<MediaItem>(item.media_content_json);
  const rawResult = parseJson<Record<string, unknown> | string>(item.raw_result_json, item.raw_result_json || '');
  const answer = enrichCitations(item.answer_content, citationReferences);

  return (
    <article className={`cardPanel subtaskCard ${expanded ? 'expanded' : ''}`}>
      <button className="subtaskSummary" type="button" onClick={onToggle} aria-expanded={expanded}>
        <span className="subtaskToggleIcon">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
        <span className="platformBadge">
          {platformIcon(item.platform) && <img src={platformIcon(item.platform)} alt="" />}
          {platformLabel(item.platform)}
        </span>
        <span className="modePill">{modeLabel(item.mode)}</span>
        <span className="subtaskPromptInline">{item.prompt || '-'}</span>
        <StatusBadge status={item.status || 'unknown'} />
      </button>

      {expanded && (
        <div className="subtaskExpandedBody">
          <div className="subtaskInfoStrip">
            <div>
              <span>子任务 ID</span>
              <strong>{item.subtask_id}</strong>
            </div>
            <div>
              <span>执行时间</span>
              <strong>{formatRemoteTime(item.time)}</strong>
            </div>
            <div>
              <span>节点 IP</span>
              <strong>{item.proxy_ip || '-'}</strong>
            </div>
            <div>
              <span>序号</span>
              <strong>#{index + 1}</strong>
            </div>
          </div>

          <section className="reasoningSection">
            <h3>推理过程</h3>
            <ReasoningPanel content={reasoning} references={citationReferences} />
          </section>

          <section className="answerSection">
            <div className="sectionTitleRow">
              <h3>回答内容</h3>
              {item.page_screenshot && <ScreenshotPreview url={item.page_screenshot} />}
            </div>
            {answer ? <MarkdownContent content={answer} /> : <p className="muted">暂无回答内容</p>}
            {item.error_message && <div className="error">{item.error_message}</div>}
          </section>

          <div className="subtaskSupplementGrid">
            <SourceList title="引用来源" items={referenceList} />
            <SourceList title="文内引用" items={citationList} />

            <section className="subtaskSupplement">
              <h3>推荐问题</h3>
              <RecommendedQuestionList questions={recommendedQuestions} />
            </section>

            <section className="subtaskSupplement">
              <h3>媒体内容</h3>
              {mediaContent.length > 0 ? (
                <div className="mediaList">
                  {mediaContent.map((mediaItem, mediaIndex) => {
                    const media = typeof mediaItem === 'string' ? { url: mediaItem } : mediaItem;
                    return (
                      <a key={mediaIndex} href={media.url || '#'} target="_blank" rel="noreferrer" className="mediaItem">
                        <strong>{media.title || media.url || `媒体 ${mediaIndex + 1}`}</strong>
                        {media.desc && <span>{media.desc}</span>}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">暂无数据</p>
              )}
            </section>

            <section className="subtaskSupplement rawResultSection">
              <h3>原始结果</h3>
              <HighlightedJson value={rawResult} />
            </section>
          </div>
        </div>
      )}
    </article>
  );
}

export function TaskDetailPage() {
  const { taskId = '' } = useParams();
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(() => new Set());
  const [expandedInitialTaskId, setExpandedInitialTaskId] = useState('');
  const [subtaskStatus, setSubtaskStatus] = useState('all');
  const [selectedPlatformFilters, setSelectedPlatformFilters] = useState<string[]>([]);
  const [platformFilterOpen, setPlatformFilterOpen] = useState(false);
  const [subtaskFilter, setSubtaskFilter] = useState('all');
  const [subtaskPage, setSubtaskPage] = useState(1);
  const platformFilterRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.getTask(taskId),
    enabled: Boolean(taskId),
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: 15000
  });
  const sync = useMutation({
    mutationFn: () => api.syncTask(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] })
  });

  const subtasks = data?.subTaskList ?? [];
  const statusCounts = useMemo(() => {
    return subtasks.reduce<Record<string, number>>((counts, item) => {
      const status = item.status || 'unknown';
      counts.all += 1;
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, { all: 0 });
  }, [subtasks]);

  const platformFilterOptions = useMemo(() => {
    const map = new Map<string, number>();
    subtasks.forEach((item) => {
      const value = item.platform || 'unknown';
      map.set(value, (map.get(value) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  }, [subtasks]);

  const promptOptions = useMemo(() => {
    const prompts = new Set<string>();
    subtasks.forEach((item) => {
      const statusMatched = subtaskStatus === 'all' || (item.status || 'unknown') === subtaskStatus;
      const platformMatched = selectedPlatformFilters.length === 0 || selectedPlatformFilters.includes(item.platform || 'unknown');
      if (statusMatched && platformMatched && item.prompt) {
        prompts.add(item.prompt);
      }
    });
    return Array.from(prompts);
  }, [selectedPlatformFilters, subtaskStatus, subtasks]);

  const filteredSubtasks = useMemo(() => {
    return subtasks.filter((item) => {
      const statusMatched = subtaskStatus === 'all' || (item.status || 'unknown') === subtaskStatus;
      const platformMatched = selectedPlatformFilters.length === 0 || selectedPlatformFilters.includes(item.platform || 'unknown');
      const subtaskMatched = subtaskFilter === 'all' || item.prompt === subtaskFilter;
      return statusMatched && platformMatched && subtaskMatched;
    });
  }, [selectedPlatformFilters, subtaskFilter, subtaskStatus, subtasks]);

  const subtaskTotalPages = Math.max(1, Math.ceil(filteredSubtasks.length / SUBTASK_PAGE_SIZE));
  const normalizedSubtaskPage = Math.min(subtaskPage, subtaskTotalPages);
  const visibleSubtasks = filteredSubtasks.slice(
    (normalizedSubtaskPage - 1) * SUBTASK_PAGE_SIZE,
    normalizedSubtaskPage * SUBTASK_PAGE_SIZE
  );
  const firstSubtaskId = subtasks.find((item) => item.status === 'completed')?.subtask_id || subtasks[0]?.subtask_id;

  useEffect(() => {
    setSubtaskPage(1);
  }, [selectedPlatformFilters, subtaskFilter, subtaskStatus, taskId]);

  useEffect(() => {
    if (subtaskFilter !== 'all' && !promptOptions.includes(subtaskFilter)) {
      setSubtaskFilter('all');
    }
  }, [subtaskFilter, promptOptions]);

  useEffect(() => {
    if (subtaskPage > subtaskTotalPages) {
      setSubtaskPage(subtaskTotalPages);
    }
  }, [subtaskPage, subtaskTotalPages]);

  useEffect(() => {
    if (!taskId || !firstSubtaskId || expandedInitialTaskId === taskId) return;
    setExpandedSubtasks(new Set([firstSubtaskId]));
    setExpandedInitialTaskId(taskId);
  }, [expandedInitialTaskId, firstSubtaskId, taskId]);

  useEffect(() => {
    function closePlatformFilter(event: MouseEvent) {
      if (platformFilterRef.current && !platformFilterRef.current.contains(event.target as Node)) {
        setPlatformFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', closePlatformFilter);
    return () => document.removeEventListener('mousedown', closePlatformFilter);
  }, []);

  function togglePlatformFilter(value: string) {
    setSelectedPlatformFilters((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }
      return [...current, value];
    });
  }

  const callbackEvents = data?.callback_url ? (data.callbackEvents ?? []) : [];

  if (isLoading) {
    return <section className="page">加载中...</section>;
  }
  if (!data) {
    return <section className="page">任务不存在</section>;
  }

  return (
    <section className="page taskDetailPage">
      <header className="pageHeader taskDetailHeader">
        <div className="taskHeaderMain">
          <div className="titleRow">
            <Link className="backIconButton" to="/tasks" title="返回任务列表" aria-label="返回任务列表">
              <ArrowLeft size={18} />
            </Link>
            <RadioTower className="titleIcon" size={22} />
            <h1 className="monoTitle">{data.task_id}</h1>
          </div>
          <p className="pageSubtitle inlineSubtitle">
            <StatusBadge status={data.status} /> {data.completed_items}/{data.total_items} 完成，失败 {data.failed_items}
          </p>
        </div>
        <button className="iconTextButton" onClick={() => sync.mutate()} disabled={sync.isPending} title="手动补偿同步">
          <RefreshCw size={16} />
          {sync.isPending ? '同步中...' : '补偿同步'}
        </button>
      </header>

      <div className="summaryBand cardPanel">
        <div>
          <span>Callback</span>
          <strong>{data.callback_url || '未配置'}</strong>
        </div>
        <div>
          <span>创建时间</span>
          <strong>{data.created_local_at}</strong>
        </div>
        <div>
          <span>更新时间</span>
          <strong>{data.updated_at}</strong>
        </div>
      </div>

      <div className="sectionHeadingRow">
        <h2>子任务结果</h2>
        <span>{subtasks.length} 个子任务，只渲染当前页</span>
      </div>

      <div className="subtaskWorkbench cardPanel">
        <div className="subtaskFilters">
          {[
            ['all', '全部'],
            ['completed', '已完成'],
            ['processing', '处理中'],
            ['pending', '待处理'],
            ['failed', '失败']
          ].map(([value, label]) => (
            <button
              className={subtaskStatus === value ? 'filterPill active' : 'filterPill'}
              key={value}
              type="button"
              onClick={() => setSubtaskStatus(value)}
            >
              {label}
              <span>{statusCounts[value] || 0}</span>
            </button>
          ))}
        </div>
        <div className="subtaskSelects">
          <div className="multiSelect taskPlatformFilter" ref={platformFilterRef}>
            <button type="button" className="multiSelectTrigger" onClick={() => setPlatformFilterOpen((value) => !value)}>
              <span className={`selectedPlatformPreview ${selectedPlatformFilters.length === 0 ? 'placeholder' : ''}`}>
                {selectedPlatformFilters.length === 0 && '全部平台'}
                {selectedPlatformFilters.map((value) => (
                  <span className="selectedPlatformPill" key={value}>
                    {platformIcon(value) && <img src={platformIcon(value)} alt="" />}
                    {platformLabel(value)}
                  </span>
                ))}
              </span>
              <ChevronDown size={16} />
            </button>
            {platformFilterOpen && (
              <div className="multiSelectMenu">
                {platformFilterOptions.map((item) => {
                  const checked = selectedPlatformFilters.includes(item.value);
                  return (
                    <button type="button" className="platformOption" key={item.value} onClick={() => togglePlatformFilter(item.value)}>
                      {platformIcon(item.value) && <img src={platformIcon(item.value)} alt="" />}
                      <div>
                        <strong>{platformLabel(item.value)}</strong>
                      </div>
                      <span className={`checkMark ${checked ? 'checked' : ''}`}>
                        {checked && <Check size={13} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <AppSelect
            value={subtaskFilter}
            onChange={setSubtaskFilter}
            ariaLabel="子任务筛选"
            options={[
              { value: 'all', label: '全部提示词' },
              ...promptOptions.map((prompt) => ({ value: prompt, label: prompt }))
            ]}
          />
        </div>
      </div>

      <div className="subtaskList">
        {visibleSubtasks.map((item, index) => (
          <SubtaskPanel
            key={item.subtask_id}
            item={item}
            index={(normalizedSubtaskPage - 1) * SUBTASK_PAGE_SIZE + index}
            expanded={expandedSubtasks.has(item.subtask_id)}
            onToggle={() => {
              setExpandedSubtasks((current) => {
                const next = new Set(current);
                if (next.has(item.subtask_id)) {
                  next.delete(item.subtask_id);
                } else {
                  next.add(item.subtask_id);
                }
                return next;
              });
            }}
          />
        ))}
        {visibleSubtasks.length === 0 && <div className="emptyState">暂无匹配的子任务</div>}
      </div>

      {filteredSubtasks.length > 0 && (
        <div className="subtaskPagination cardPanel">
          <span>
            共 {filteredSubtasks.length} 条 · 第 {normalizedSubtaskPage}/{subtaskTotalPages} 页 · 当前渲染 {visibleSubtasks.length} 条
          </span>
          <div>
            <button className="outlineButton" disabled={normalizedSubtaskPage === 1} onClick={() => setSubtaskPage(1)}>首页</button>
            <button className="outlineButton" disabled={normalizedSubtaskPage === 1} onClick={() => setSubtaskPage((value) => Math.max(1, value - 1))}>上一页</button>
            <button className="outlineButton" disabled={normalizedSubtaskPage >= subtaskTotalPages} onClick={() => setSubtaskPage((value) => Math.min(subtaskTotalPages, value + 1))}>下一页</button>
            <button className="outlineButton" disabled={normalizedSubtaskPage >= subtaskTotalPages} onClick={() => setSubtaskPage(subtaskTotalPages)}>末页</button>
          </div>
        </div>
      )}

      <div className="sectionHeadingRow">
        <h2>Callback 记录</h2>
        {!data.callback_url && <span>未配置 Callback</span>}
      </div>
      <div className="cardPanel tablePanel">
        {data.callback_url ? (
          <table className="adminTable callbackTable">
            <thead>
              <tr>
                <th>接收时间</th>
                <th>处理状态</th>
                <th>任务状态</th>
                <th>来源 IP</th>
                <th>子任务</th>
                <th>Payload Hash</th>
              </tr>
            </thead>
            <tbody>
              {callbackEvents.map((event) => {
                const info = callbackInfo(event);
                return (
                  <tr key={event.id}>
                    <td>
                      <span className="timeCell"><Clock3 size={14} />{event.received_at}</span>
                    </td>
                    <td>{event.process_status}</td>
                    <td>{info.status}</td>
                    <td>{info.ip}</td>
                    <td>{info.subtaskCount}</td>
                    <td className="hash">{event.payload_hash}</td>
                  </tr>
                );
              })}
              {callbackEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="emptyCell">暂无外部 Callback 记录</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="callbackEmpty">
            当前任务没有配置 Callback URL，因此这里不展示补偿同步或本地同步产生的记录。
          </div>
        )}
      </div>
    </section>
  );
}
