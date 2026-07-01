import { useState, useEffect } from 'react';
import { tasksApi, agentsApi } from '../../services/api';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
}

interface Report {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
  duration?: string | null;
  roles: Array<{ agentId: string; agentName: string; roleName: string; messageCount: number }>;
  totalMessages: number;
  totalAuditLogs: number;
  testReport?: { total: number; passed: number; failed: number; passRate: string };
  timeline: Array<{ time: string; sender: string; type: string; preview: string }>;
}

const STATUS_EMOJI: Record<string, string> = {
  pending: '⏳',
  running: '🔄',
  completed: '✅',
  failed: '❌',
};

export default function ReportView() {
  const [report, setReport] = useState<Report | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    agentsApi.list().then((res: any) => {
      // Fetch tasks from all agents
      const loadTasks = async () => {
        try {
          const taskRes: any = await tasksApi.list({ page: 1, size: 100 });
          setTasks(taskRes.data?.tasks || taskRes.data || []);
        } catch (e) {
          console.error('Failed to load tasks:', e);
        }
      };
      loadTasks();
    });
  }, []);

  const generateReport = async () => {
    if (!selectedTaskId) return;
    setLoading(true);
    try {
      const res: any = await tasksApi.getReport(selectedTaskId);
      setReport(res.data);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || '生成报告失败';
      console.error('Report generation failed:', msg);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report.taskId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTXT = () => {
    if (!report) return;
    const text = [
      `# 任务报告: ${report.title}`,
      ``,
      `状态: ${STATUS_EMOJI[report.status] || ''} ${report.status}`,
      `优先级: ${report.priority}`,
      `创建时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}`,
      `完成时间: ${report.completedAt ? new Date(report.completedAt).toLocaleString('zh-CN') : '-'}`,
      `耗时: ${report.duration || '-'}`,
      ``,
      `## 角色贡献`,
      ...report.roles.map(r => `- ${r.agentName} (${r.roleName}): ${r.messageCount} 条消息`),
      ``,
      `## 通信统计`,
      `消息总数: ${report.totalMessages}`,
      `审计日志: ${report.totalAuditLogs}`,
      ...(report.testReport ? [
        ``,
        `## 测试结果`,
        `总计: ${report.testReport.total}`,
        `通过: ${report.testReport.passed}`,
        `失败: ${report.testReport.failed}`,
        `通过率: ${report.testReport.passRate}%`,
      ] : []),
      ``,
      `## 时间线`,
      ...report.timeline.map(t => `- ${t.time} ${t.sender}: ${t.preview}`),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report.taskId}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gradient">📝 结果报告</h2>
        <p className="text-xs text-gray-500 mt-1">生成和分析任务执行报告</p>
      </div>

      {/* Task selector */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <select
            value={selectedTaskId}
            onChange={e => { setSelectedTaskId(e.target.value); setReport(null); }}
            className="flex-1 px-4 py-2.5 bg-[#0f1629] border border-gray-700/50 rounded-lg text-sm text-white outline-none focus:border-indigo-500"
          >
            <option value="">— 选择任务 —</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {STATUS_EMOJI[t.status] || ''} {t.title} ({t.status})
              </option>
            ))}
          </select>
          <button
            onClick={generateReport}
            disabled={loading || !selectedTaskId}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-30 shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            {loading ? '⏳ 生成中...' : '📊 生成报告'}
          </button>
        </div>
        {tasks.length === 0 && (
          <div className="text-xs text-gray-600 mt-3 text-center">暂无任务，请先在"任务管理"中创建任务</div>
        )}
      </div>

      {/* Report content */}
      {report && (
        <div className="space-y-5 animate-fade-in">
          {/* Overview */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '状态', value: `${STATUS_EMOJI[report.status] || ''} ${report.status}`, color: report.status === 'completed' ? 'text-emerald-400' : report.status === 'failed' ? 'text-red-400' : report.status === 'running' ? 'text-blue-400' : 'text-amber-400' },
              { label: '优先级', value: report.priority, color: 'text-white' },
              { label: '消息数', value: report.totalMessages, color: 'text-indigo-400' },
              { label: '审计日志', value: report.totalAuditLogs, color: 'text-purple-400' },
            ].map(item => (
              <div key={item.label} className="glass-card rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Roles table */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">👥 角色贡献</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-indigo-500/10">
                    <th className="text-left py-2.5 px-3">Agent</th>
                    <th className="text-left py-2.5 px-3">角色</th>
                    <th className="text-right py-2.5 px-3">消息数</th>
                  </tr>
                </thead>
                <tbody>
                  {report.roles.map((r, i) => (
                    <tr key={i} className="border-b border-indigo-500/5 hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 text-gray-200 font-medium">{r.agentName}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-300 rounded-full text-xs">{r.roleName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{r.messageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Test results */}
          {report.testReport && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">🧪 测试结果</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: '总计', value: report.testReport.total, color: 'text-white' },
                  { label: '通过', value: report.testReport.passed, color: 'text-emerald-400' },
                  { label: '失败', value: report.testReport.failed, color: 'text-red-400' },
                  { label: '通过率', value: `${report.testReport.passRate}%`, color: parseFloat(report.testReport.passRate) >= 80 ? 'text-blue-400' : 'text-amber-400' },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">📅 通信时间线</h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {report.timeline.slice(-30).reverse().map((t, i) => (
                <div key={i} className="flex gap-3 text-xs p-2 rounded-lg hover:bg-white/[0.02]">
                  <span className="text-gray-600 whitespace-nowrap w-20 font-mono">
                    {new Date(t.time).toLocaleTimeString('zh-CN')}
                  </span>
                  <span className="text-indigo-400 whitespace-nowrap w-20">{t.sender}</span>
                  <span className="text-gray-400 truncate">{t.preview}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="flex gap-3">
            <button onClick={exportJSON} className="px-5 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-600/30 transition">
              📄 导出 JSON
            </button>
            <button onClick={exportTXT} className="px-5 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-600/30 transition">
              📃 导出 TXT
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && tasks.length > 0 && (
        <div className="text-center py-16 text-gray-600">
          <div className="text-5xl mb-4 opacity-30">📝</div>
          <div className="text-sm">选择一个任务生成报告</div>
        </div>
      )}
    </div>
  );
}
