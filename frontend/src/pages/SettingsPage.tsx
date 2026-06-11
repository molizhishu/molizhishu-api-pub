import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LockKeyhole, Save, Settings, ShieldCheck, Webhook, WebhookOff } from 'lucide-react';
import { api } from '../api';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: currentCallbackUrl } = useQuery({ queryKey: ['callback-url'], queryFn: api.getCallbackUrl });
  const [apiKey, setApiKey] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCallbackUrl(currentCallbackUrl || '');
  }, [currentCallbackUrl]);

  useEffect(() => {
    setSaved(false);
  }, [apiKey, callbackUrl]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedApiKey = apiKey.trim();
      const trimmedCallbackUrl = callbackUrl.trim();
      const callbackChanged = trimmedCallbackUrl !== (currentCallbackUrl || '');

      const results: unknown[] = [];
      if (settings?.security?.apiKeyUpdateAllowed && trimmedApiKey) {
        results.push(await api.updateApiKey(trimmedApiKey));
      }
      if (callbackChanged) {
        results.push(await api.updateCallbackUrl(trimmedCallbackUrl || null));
      }
      if (results.length === 0) {
        return null;
      }

      return results;
    },
    onSuccess: () => {
      setApiKey('');
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['callback-url'] });
      setTimeout(() => setSaved(false), 3000);
    }
  });

  function saveAll(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate();
  }

  const canEditApiKey = Boolean(settings?.security?.apiKeyUpdateAllowed);
  const apiKeyText = settings?.apiKey.configured ? 'API Key 已配置' : 'API Key 未配置';
  const callbackText = currentCallbackUrl ? '全局 Callback 已配置' : '全局 Callback 未配置';
  const apiKeySaveable = canEditApiKey && apiKey.trim().length > 0;
  const callbackChanged = callbackUrl.trim() !== (currentCallbackUrl || '');
  const canSave = apiKeySaveable || callbackChanged;

  return (
    <section className="page narrow">
      <header className="pageHeader">
        <div className="titleRow">
          <Settings className="titleIcon" size={22} />
          <h1>系统设置</h1>
        </div>
        <div className="pageSubtitle">
          <p>统一管理服务端 API Key 和模力指数全局 Callback。</p>
        </div>
      </header>

      <form className="form cardPanel settingsSection" onSubmit={saveAll}>
        <div className="settingsHero">
          <div>
            <div className="settingsEyebrow">当前配置</div>
            <h2>连接模力指数服务</h2>
            <p>API Key 用于服务端请求鉴权；Callback 用于接收任务完成后的主动推送。</p>
          </div>
        </div>

        <div className="settingsSecurityBar">
          {canEditApiKey ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}
          <div>
            <strong>{canEditApiKey ? '开发环境已开启页面修改权限' : '生产保护已开启'}</strong>
            <span>
              {canEditApiKey
                ? '保存后会立即更新服务端环境配置，请确认当前不是生产环境。'
                : '当前环境默认禁止通过页面修改 API Key，如需开启请由部署人员调整服务端环境变量。'}
            </span>
          </div>
        </div>

        <div className="settingsGrid">
          <div className={`settingBlock ${canEditApiKey ? '' : 'isLocked'}`}>
            <div className="settingStatus">
              <KeyRound size={18} />
              <div>
                <strong>{apiKeyText}</strong>
                <span>{settings?.apiKey.masked || '提交监控任务前需要先配置 API Key'}</span>
              </div>
            </div>
            <label className="settingField">
              <span>新 API Key</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={canEditApiKey ? '输入新的模力指数 API Key' : '当前环境已锁定，不能在页面修改'}
                autoComplete="off"
                disabled={!canEditApiKey}
              />
            </label>
            {!canEditApiKey && <div className="settingNote">页面仅展示当前配置状态，不提供 API Key 明文读取或在线修改。</div>}
          </div>

          <div className="settingBlock">
            <div className="settingStatus">
              {currentCallbackUrl ? <Webhook size={18} /> : <WebhookOff size={18} />}
              <div>
                <strong>{callbackText}</strong>
                <span>{currentCallbackUrl || '未单独传 callbackUrl 的任务将不会收到主动推送'}</span>
              </div>
            </div>
            <label className="settingField">
              <span>Callback URL</span>
              <input
                value={callbackUrl}
                onChange={(event) => setCallbackUrl(event.target.value)}
                placeholder="https://your-domain.com/webhooks/molizhishu"
              />
            </label>
          </div>
        </div>

        {saveMutation.error && <div className="error">{(saveMutation.error as Error).message}</div>}
        {saved && <div className="successMessage">设置已保存。</div>}

        <div className="formActions">
          <button className="primaryButton" disabled={saveMutation.isPending || !canSave}>
            <Save size={16} />
            {saveMutation.isPending ? '保存中...' : '保存设置'}
          </button>
        </div>
      </form>
    </section>
  );
}
