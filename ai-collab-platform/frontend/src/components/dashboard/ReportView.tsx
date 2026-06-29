import { useState, useEffect } from 'react';
import { tasksApi } from '../../services/api';

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
  testReport?: {
    total: number;
    passed: number;
    failed: number;
    passRate: string;
  };
  timeline: Array<{ time: string; sender: string; type: string; preview: string }>;
}

export default function ReportView() {
  const [report, setReport] = useState<Report | null>(null);
  const [taskId, setTaskId] = useState('');
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await tasksApi.getReport(taskId);
      setReport(res.data);
    } catch (e) {
      alert('生成报告失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-primary">📝 结果报告</h2>

      {/* 输入框 */}
      <div className="flex gap-2 mb-8">
        <input
          value={taskId}
          onChange={e => setTaskId(e.target.value)}
          placeholder="输入任务 ID"
          className="flex-1 px-4 py-2 bg-surface rounded border border-surface focus:border-primary outline-none"
        />
        <button
          onClick={generateReport}
          disabled={loading || !taskId}
          className="px-6 py-2 bg-primary rounded hover:bg-opacity-80 disabled:opacity-50"
        >
          {loading ? '生成中...' : '生成报告'}
        </button>
      </div>

      {/* 报告内容 */}
      {report && (
        <div className="space-y-6">
          {/* 概览卡片 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface rounded-lg p-4">
              <div className="text-sm text-gray-400">状态</div>
              <div className={`text-lg font-bold ${
                report.status === 'completed' ? 'text-green-500' :
                report.status === 'failed' ? 'text-red-500' : 'text-yellow-500'
              }`}>{report.status}</div>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <div className="text-sm text-gray-400">优先级</div>
              <div className="text-lg font-bold text-white">{report.priority}</div>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <div className="text-sm text-gray-400">耗时</div>
              <div className="text-lg font-bold text-blue-500">{report.duration || '-'}</div>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <div className="text-sm text-gray-400">消息数</div>
              <div className="text-lg font-bold text-purple-500">{report.totalMessages}</div>
            </div>
          </div>

          {/* 角色贡献 */}
          <div className="bg-surface rounded-lg p-4">
            <h3 className="font-semibold mb-3">👥 角色贡献</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-surface">
                  <th className="text-left py-2">Agent</th>
                  <th className="text-left py-2">角色</th>
                  <th className="text-left py-2">消息数</th>
                </tr>
              </thead>
              <tbody>
                {report.roles.map((r, i) => (
                  <tr key={i} className="border-b border-surface/50">
                    <td className="py-2 font-medium">{r.agentName}</td>
                    <td className="py-2"><span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">{r.roleName}</span></td>
                    <td className="py-2">{r.messageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 测试结果 */}
          {report.testReport && (
            <div className="bg-surface rounded-lg p-4">
              <h3 className="font-semibold mb-3">🧪 测试结果</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-400">总计</div>
                  <div className="text-2xl font-bold">{report.testReport.total}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">通过</div>
                  <div className="text-2xl font-bold text-green-500">{report.testReport.passed}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">失败</div>
                  <div className="text-2xl font-bold text-red-500">{report.testReport.failed}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">通过率</div>
                  <div className="text-2xl font-bold text-blue-500">{report.testReport.passRate}%</div>
                </div>
              </div>
            </div>
          )}

          {/* 时间线 */}
          <div className="bg-surface rounded-lg p-4">
            <h3 className="font-semibold mb-3">📅 时间线</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {report.timeline.slice(-20).map((t, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-gray-500 whitespace-nowrap w-24">
                    {new Date(t.time).toLocaleTimeString()}
                  </span>
                  <span className="text-primary whitespace-nowrap w-20">{t.sender}</span>
                  <span className="text-gray-300 truncate">{t.preview}...</span>
                </div>
              ))}
            </div>
          </div>

          {/* 导出按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report-${report.taskId}.json`;
                a.click();
              }}
              className="px-4 py-2 bg-green-600 rounded hover:bg-opacity-80"
            >
              导出 JSON
            </button>
            <button
              onClick={() => {
                const text = `# 任务报告: ${report.title}\n\n` +
                  `状态: ${report.status}\n优先级: ${report.priority}\n` +
                  `创建时间: ${report.createdAt}\n完成时间: ${report.completedAt || '-'}\n` +
                  `耗时: ${report.duration || '-'}\n\n` +
                  `## 角色贡献\n` +
                  report.roles.map(r => `- ${r.agentName} (${r.roleName}): ${r.messageCount} 条消息`).join('\n') +
                  `\n\n## 消息总数: ${report.totalMessages}\n` +
                  `审计日志: ${report.totalAuditLogs}\n` +
                  (report.testReport ? `\n## 测试结果\n总计: ${report.testReport.total}, 通过: ${report.testReport.passed}, 失败: ${report.testReport.failed}, 通过率: ${report.testReport.passRate}%` : '') +
                  `\n\n## 时间线\n` +
                  report.timeline.map(t => `- ${t.time} ${t.sender}: ${t.preview}`).join('\n');
                
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report-${report.taskId}.txt`;
                a.click();
              }}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-opacity-80"
            >
              导出 TXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
