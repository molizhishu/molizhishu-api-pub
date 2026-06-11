import { FormEvent, UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, RadioTower, Send } from 'lucide-react';
import { api } from '../api';
import { AppSelect } from '../ui/AppSelect';
import { modeOptions, platformOptions, screenshotOptions } from '../molizhishuOptions';

type CityOption = {
  province: string;
  regionCode: string[];
};

export function NewTaskPage() {
  const navigate = useNavigate();
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const platformSelectRef = useRef<HTMLDivElement>(null);
  const [promptText, setPromptText] = useState('请帮我搜索新能源汽车销量趋势');
  const [monitorKeywords, setMonitorKeywords] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [mode, setMode] = useState('search');
  const [screenshot, setScreenshot] = useState(0);
  const [regionCode, setRegionCode] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.getCities()
  });

  const promptLines = useMemo(() => promptText.split('\n'), [promptText]);
  const promptCount = promptLines.map((line) => line.trim()).filter(Boolean).length;
  const selectedPlatformItems = selectedPlatforms
    .map((value) => platformOptions.find((item) => item.value === value))
    .filter(Boolean);
  const visiblePlatformItems = selectedPlatformItems.slice(0, 2);
  const hiddenPlatformCount = Math.max(0, selectedPlatformItems.length - visiblePlatformItems.length);
  const selectedPlatformTitle = selectedPlatformItems.map((item) => item?.label).filter(Boolean).join('、');

  const mutation = useMutation({
    mutationFn: api.createTask,
    onSuccess: (data: any) => navigate(`/tasks/${data.taskId}`)
  });

  useEffect(() => {
    function closePlatformSelect(event: MouseEvent) {
      if (platformSelectRef.current && !platformSelectRef.current.contains(event.target as Node)) {
        setPlatformOpen(false);
      }
    }

    document.addEventListener('mousedown', closePlatformSelect);
    return () => document.removeEventListener('mousedown', closePlatformSelect);
  }, []);

  function togglePlatform(value: string) {
    setSelectedPlatforms((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }
      return [...current, value];
    });
  }

  function syncLineScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (lineNumberRef.current) {
      lineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const prompts = promptText.split('\n').map((item) => item.trim()).filter(Boolean);
    mutation.mutate({
      monitorKeywords: monitorKeywords || undefined,
      prompts,
      platforms: selectedPlatforms.map((platform) => ({ platform, mode, screenshot })),
      regionCode: regionCode ? [regionCode] : undefined,
      callbackUrl: callbackUrl || undefined
    });
  }

  return (
    <section className="page formPage">
      <header className="pageHeader">
        <div className="titleRow">
          <RadioTower className="titleIcon" size={22} />
          <h1>新建监控任务</h1>
        </div>
        <div className="pageSubtitle">
          <p>每一行提示词会作为一个独立监控问题提交，平台可多选。</p>
        </div>
      </header>

      <form className="taskCreateShell" onSubmit={submit}>
        <div className="cardPanel taskMainPanel">
          <label className="editorField">
            <span>监控关键词</span>
            <input value={monitorKeywords} onChange={(event) => setMonitorKeywords(event.target.value)} placeholder="品牌或关键词，可选" />
          </label>

          <label className="editorField editorFieldTall">
            <span>提示词</span>
            <div className="promptEditor">
              <div className="lineNumbers" ref={lineNumberRef}>
                {promptLines.map((_, index) => (
                  <span key={index}>{index + 1}</span>
                ))}
              </div>
              <textarea
                value={promptText}
                onChange={(event) => setPromptText(event.target.value)}
                onScroll={syncLineScroll}
                rows={12}
                placeholder={'每行一个独立提示词，例如：\n请帮我搜索新能源汽车销量趋势\n请分析某品牌在 AI 搜索中的曝光情况'}
              />
            </div>
          </label>
          <div className="editorHint">当前将提交 {promptCount} 条提示词；空行会自动忽略。</div>
        </div>

        <aside className="cardPanel taskSidePanel">
          <div className="sideField">
            <label>平台</label>
            <div className="multiSelect" ref={platformSelectRef}>
              <button type="button" className="multiSelectTrigger" onClick={() => setPlatformOpen((value) => !value)}>
                <span
                  className={`selectedPlatformPreview ${selectedPlatformItems.length === 0 ? 'placeholder' : ''}`}
                  title={selectedPlatformTitle}
                >
                  {selectedPlatformItems.length === 0 && '请选择平台，可多选'}
                  {visiblePlatformItems.map((item) => item && (
                    <span className="selectedPlatformPill" key={item.value}>
                      <img src={item.icon} alt="" />
                      {item.label}
                    </span>
                  ))}
                  {hiddenPlatformCount > 0 && <span className="selectedPlatformPill selectedPlatformMore">+{hiddenPlatformCount}</span>}
                </span>
                <ChevronDown size={16} />
              </button>
              {platformOpen && (
                <div className="multiSelectMenu">
                  {platformOptions.map((item) => {
                    const checked = selectedPlatforms.includes(item.value);
                    return (
                      <button type="button" className="platformOption" key={item.value} onClick={() => togglePlatform(item.value)}>
                        <img src={item.icon} alt="" />
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.description}</span>
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
            <div className="sideHint">至少选择一个平台</div>
          </div>

          <div className="sideField">
            <label>模式</label>
            <AppSelect value={mode} onChange={setMode} options={modeOptions.map((item) => ({ value: item.value, label: item.label }))} />
          </div>

          <div className="sideField">
            <label>截图</label>
            <AppSelect
              value={String(screenshot)}
              onChange={(value) => setScreenshot(Number(value))}
              options={screenshotOptions.map((item) => ({ value: String(item.value), label: item.label }))}
            />
          </div>

          <div className="sideField">
            <label>区域</label>
            <AppSelect
              value={regionCode}
              onChange={setRegionCode}
              disabled={citiesLoading}
              options={[
                { value: '', label: '不指定区域' },
                ...(cities as CityOption[]).map((city) => {
                const code = city.regionCode[0] || '';
                return { value: code, label: `${city.province}（${code}）` };
                })
              ]}
            />
          </div>

          <div className="sideField">
            <label>本次 Callback</label>
            <input value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} placeholder="留空使用全局 Callback" />
          </div>

          {mutation.error && <div className="error">{(mutation.error as Error).message}</div>}

          <div className="sideActions">
            <button className="primaryButton" disabled={mutation.isPending || promptCount === 0 || selectedPlatforms.length === 0}>
              <Send size={16} />
              {mutation.isPending ? '提交中...' : '提交任务'}
            </button>
          </div>
        </aside>
      </form>
    </section>
  );
}
