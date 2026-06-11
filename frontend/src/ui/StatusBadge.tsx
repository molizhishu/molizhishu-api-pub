const terminal = new Set(['completed', 'partial_completed']);
const failed = new Set(['failed', 'error', 'stopped']);
const statusLabels: Record<string, string> = {
  completed: '已完成',
  partial_completed: '部分完成',
  processing: '处理中',
  pending: '待处理',
  failed: '失败',
  error: '错误',
  stopped: '已停止',
  unknown: '未知'
};

export function StatusBadge({ status }: { status: string }) {
  const tone = terminal.has(status) ? 'good' : failed.has(status) ? 'bad' : 'work';
  return <span className={`status ${tone}`}>{statusLabels[status] || status}</span>;
}
