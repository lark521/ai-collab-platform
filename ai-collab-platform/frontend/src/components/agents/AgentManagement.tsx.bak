import { useState } from 'react';
import { useAgents } from '../../hooks/useAgents';

const PLATFORM_HOST = window.location.host;
const PLATFORM_PROTO = window.location.protocol === 'https:' ? 'https' : 'http';

const AGENT_TYPES = [
  { value: 'openclaw', label: '🦝 OpenClaw' },
  { value: 'hermes', label: '🦙 Hermes' },
  { value: 'custom', label: '🤖 Custom' },
];

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-gray-500',
  error: 'bg-red-500',
};

export default function AgentManagement() {
  const { agents, loading, addAgent, updateAgent, deleteAgent, regenerateApiKey } = useAgents();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'openclaw', remoteUrl: '' });
  const [newKey, setNewKey] = useState<string | null>(null);
  const [adapterCommand, setAdapterCommand] = useState<string | null>(null);
  const [commandAgent, setCommandAgent] = useState<{ name: string; id: string; type: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await addAgent(formData);
      setFormData({ name: '', type: 'openclaw', remoteUrl: '' });
      setShowForm(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
      console.error('[AgentManagement] Error:', err);
      alert(`注册失败: ${msg}`);
    }
  };

  const handleRegenerate = async (id: string) => {
    if (!confirm('确定要重新生成 API Key 吗？旧 Key 将立即失效。')) return;
    try {
      const key = await regenerateApiKey(id);
      setNewKey(key);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || '重新生成 Key 失败';
      console.error('[AgentManagement] Regenerate error:', err);
      alert(`重新生成 Key 失败: ${msg}`);
    }
  };

  const handleGenerateAdapterCommand = async (agent: { id: string; name: string; type: string }) => {
    // 先确保有 API Key
    let apiKey = '';
    try {
      const key = await regenerateApiKey(agent.id);
      apiKey = key;
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Failed';
      console.error('Regenerate key failed:', msg);
      alert(`生成命令前需要 API Key: ${msg}`);
      return;
    }
    const platformUrl = `${PLATFORM_PROTO}://${PLATFORM_HOST}`;
    const command = [
      'node adapters/remote-agent-adapter.js \\',
      `  --platform-url ${platformUrl} \\`,
      `  --agent-id ${agent.id} \\`,
      `  --api-key ${apiKey} \\`,
      `  --agent-name "${agent.name}" \\`,
      `  --agent-type ${agent.type} \\`,
      `  --mode websocket`,
    ].join('\n');
    setAdapterCommand(command);
    setCommandAgent({ id: agent.id, name: agent.name, type: agent.type });
  };

  const copyCommand = async () => {
    if (adapterCommand) {
      await navigator.clipboard.writeText(adapterCommand);
      alert('命令已复制到剪贴板');
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Agent 管理</h2>
          <p className="text-sm text-gray-400 mt-1">
            共 {agents.length} 个 Agent · {agents.filter(a => a.isConnected).length} 个已连接远程
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition"
        >
          {showForm ? '✕ 取消' : '+ 添加 Agent'}
        </button>
      </div>

      {/* 添加表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-surface rounded-lg border border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-3">添加新 Agent</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-white text-sm focus:border-primary outline-none"
                placeholder="My OpenClaw Agent"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">类型</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-white text-sm focus:border-primary outline-none"
              >
                {AGENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">远程 URL（可选）</label>
              <input
                type="url"
                value={formData.remoteUrl}
                onChange={e => setFormData({ ...formData, remoteUrl: e.target.value })}
                className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-white text-sm focus:border-primary outline-none"
                placeholder="https://other-machine:3002"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded text-sm transition"
            >
              创建
            </button>
          </div>
        </form>
      )}

      {/* API Key 弹窗 */}
      {newKey && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ 新的 API Key（请立即复制保存）</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-dark rounded text-xs text-yellow-200 font-mono break-all">
              {newKey}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(newKey); }}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs"
            >
              复制
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-yellow-400 hover:text-yellow-300"
          >
            关闭
          </button>
        </div>
      )}

      {/* 适配器命令弹窗 */}
      {adapterCommand && commandAgent && (
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">
            🛠️ {commandAgent.name} 适配器命令
          </h3>
          <div className="flex items-start gap-2">
            <code className="flex-1 px-3 py-2 bg-dark rounded text-xs text-green-300 font-mono break-all whitespace-pre-wrap">
              {adapterCommand}
            </code>
            <button
              onClick={copyCommand}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs whitespace-nowrap"
            >
              复制
            </button>
          </div>
          <button
            onClick={() => { setAdapterCommand(null); setCommandAgent(null); }}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            关闭
          </button>
        </div>
      )}

      {/* Agent 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <div
            key={agent.id}
            className="p-4 bg-surface rounded-lg border border-gray-700 hover:border-gray-600 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[agent.status] || 'bg-gray-500'}`} />
                <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-dark text-gray-400">{agent.type}</span>
            </div>

            <div className="space-y-1.5 text-xs text-gray-400 mb-3">
              {agent.remoteUrl && (
                <div className="flex items-center gap-2">
                  <span>🌐</span>
                  <span className="truncate">{agent.remoteUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>{agent.isConnected ? '🔗' : '🔌'}</span>
                <span>{agent.isConnected ? '远程已连接' : '未连接远程'}</span>
              </div>
              {agent.lastHeartbeat && (
                <div className="flex items-center gap-2">
                  <span>💓</span>
                  <span>最后心跳: {new Date(agent.lastHeartbeat).toLocaleString('zh-CN')}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-700">
              <button
                onClick={() => handleRegenerate(agent.id)}
                className="flex-1 px-2 py-1.5 bg-dark hover:bg-gray-700 text-gray-300 rounded text-xs transition"
                title="重新生成 API Key"
              >
                🔄 Key
              </button>
              <button
                onClick={() => handleGenerateAdapterCommand(agent)}
                className="flex-1 px-2 py-1.5 bg-dark hover:bg-blue-900/50 text-gray-300 hover:text-blue-300 rounded text-xs transition"
                title="生成适配器命令"
              >
                ⚙️ 命令
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`确定删除 Agent "${agent.name}"？`)) return;
                  try {
                    await deleteAgent(agent.id);
                  } catch {
                    alert('删除失败');
                  }
                }}
                className="flex-1 px-2 py-1.5 bg-dark hover:bg-red-900/50 text-gray-300 hover:text-red-300 rounded text-xs transition"
                title="删除 Agent"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">🤖</div>
            <p>暂无 Agent，点击上方按钮添加</p>
          </div>
        )}
      </div>

      {/* 远程连接指南 */}
      <div className="mt-8 p-4 bg-surface rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-white mb-3">📖 远程 Agent 连接指南</h3>
        <div className="text-xs text-gray-400 space-y-2">
          <p><strong className="text-gray-300">1.</strong> 在上方添加一个 Agent，记录生成的 Agent ID</p>
          <p><strong className="text-gray-300">2.</strong> 点击 🔄 Key 生成 API Key（只显示一次，请保存）</p>
          <p><strong className="text-gray-300">3.</strong> 点击 ⚙️ 命令 自动生成适配器的运行命令</p>
          <p><strong className="text-gray-300">4.</strong> 在远程机器上粘贴命令运行，适配器会自动注册连接并发送心跳</p>
        </div>
      </div>
    </div>
  );
}
