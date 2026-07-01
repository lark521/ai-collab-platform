import { useState } from 'react';
import { useAgents } from '../../hooks/useAgents';

const PLATFORM_HOST = window.location.host;
const PLATFORM_PROTO = window.location.protocol === 'https:' ? 'https' : 'http';

const AGENT_TYPES = [
  { value: 'openclaw', label: '🦝 OpenClaw', desc: 'OpenClaw AI Agent' },
  { value: 'hermes', label: '🦙 Hermes', desc: 'Hermes AI Agent' },
  { value: 'custom', label: '🤖 Custom', desc: '自定义 Agent' },
];

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-emerald-400',
  offline: 'bg-gray-500',
  error: 'bg-red-400',
};

export default function AgentManagement() {
  const { agents, loading, addAgent, deleteAgent, regenerateApiKey } = useAgents();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'openclaw', remoteUrl: '' });
  const [newKey, setNewKey] = useState<string | null>(null);
  const [adapterCommand, setAdapterCommand] = useState<string | null>(null);
  const [commandAgent, setCommandAgent] = useState<{ name: string; id: string; type: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAgent(formData);
      setFormData({ name: '', type: 'openclaw', remoteUrl: '' });
      setShowForm(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
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
      alert(`重新生成 Key 失败: ${msg}`);
    }
  };

  const handleGenerateAdapterCommand = async (agent: { id: string; name: string; type: string }) => {
    let apiKey = '';
    try {
      apiKey = await regenerateApiKey(agent.id);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Failed';
      alert(`生成命令前需要 API Key: ${msg}`);
      return;
    }
    const platformUrl = `${PLATFORM_PROTO}://${PLATFORM_HOST}`;
    const command = [
      'node adapters/remote-agent-adapter.js \\\\',
      `  --platform-url ${platformUrl} \\\\`,
      `  --agent-id ${agent.id} \\\\`,
      `  --api-key ${apiKey} \\\\`,
      `  --agent-name "${agent.name}" \\\\`,
      `  --agent-type ${agent.type} \\\\`,
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

  const connectedCount = agents.filter(a => a.isConnected).length;

  if (loading) return <div className="h-full flex items-center justify-center text-gray-500 text-sm">加载中...</div>;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gradient">🤖 Agent 管理</h2>
          <p className="text-xs text-gray-500 mt-1">
            共 {agents.length} 个 Agent · {connectedCount} 个已连接远程
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
        >
          {showForm ? '✕ 取消' : '+ 添加 Agent'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">添加新 Agent</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#0f1629] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                placeholder="My Agent"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">类型</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#0f1629] border border-gray-700/50 rounded-lg text-sm text-white focus:border-indigo-500 outline-none"
              >
                {AGENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">远程 URL（可选）</label>
              <input
                type="url"
                value={formData.remoteUrl}
                onChange={e => setFormData({ ...formData, remoteUrl: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#0f1629] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                placeholder="https://other-machine:3002"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm rounded-lg hover:opacity-90 transition">
              创建
            </button>
          </div>
        </form>
      )}

      {/* API Key popup */}
      {newKey && (
        <div className="glass-card rounded-xl p-4 border-amber-500/30 bg-amber-500/5 animate-fade-in">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">⚠️ 新的 API Key（请立即复制保存）</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-[#0f1629] rounded-lg text-xs text-amber-200 font-mono break-all border border-amber-500/20">
              {newKey}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(newKey); }} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs transition whitespace-nowrap">
              复制
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-amber-400/60 hover:text-amber-400 transition">
            关闭
          </button>
        </div>
      )}

      {/* Adapter command popup */}
      {adapterCommand && commandAgent && (
        <div className="glass-card rounded-xl p-4 border-blue-500/30 bg-blue-500/5 animate-fade-in">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">
            🛠️ {commandAgent.name} 适配器命令
          </h3>
          <div className="flex items-start gap-2">
            <code className="flex-1 px-3 py-2 bg-[#0f1629] rounded-lg text-xs text-green-300 font-mono break-all whitespace-pre-wrap border border-green-500/20">
              {adapterCommand}
            </code>
            <button onClick={copyCommand} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition whitespace-nowrap">
              复制
            </button>
          </div>
          <button onClick={() => { setAdapterCommand(null); setCommandAgent(null); }} className="mt-2 text-xs text-blue-400/60 hover:text-blue-400 transition">
            关闭
          </button>
        </div>
      )}

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className="glass-card rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                  agent.status === 'online' || agent.isConnected
                    ? 'bg-emerald-500/15'
                    : 'bg-red-500/15'
                }`}>
                  🤖
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 text-sm">{agent.name}</h3>
                  <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-white/5 rounded">{agent.type}</span>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[agent.status] || 'bg-gray-500'}`} />
            </div>

            <div className="space-y-1.5 text-xs text-gray-500 mb-4">
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
                  <span>心跳: {new Date(agent.lastHeartbeat).toLocaleString('zh-CN')}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-indigo-500/10">
              <button
                onClick={() => handleRegenerate(agent.id)}
                className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-xs transition"
                title="重新生成 API Key"
              >
                🔄 Key
              </button>
              <button
                onClick={() => handleGenerateAdapterCommand(agent)}
                className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 rounded-lg text-xs transition"
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
                className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300 rounded-lg text-xs transition"
                title="删除 Agent"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-600">
            <div className="text-5xl mb-3 opacity-30">🤖</div>
            <p className="text-sm">暂无 Agent，点击上方按钮添加</p>
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">📖 远程 Agent 连接指南</h3>
        <div className="text-xs text-gray-500 space-y-2">
          <p><span className="text-gray-400 font-medium">1.</span> 在上方添加一个 Agent，记录生成的 Agent ID</p>
          <p><span className="text-gray-400 font-medium">2.</span> 点击 🔄 Key 生成 API Key（只显示一次，请保存）</p>
          <p><span className="text-gray-400 font-medium">3.</span> 点击 ⚙️ 命令 自动生成适配器的运行命令</p>
          <p><span className="text-gray-400 font-medium">4.</span> 在远程机器上粘贴命令运行，适配器会自动注册连接并发送心跳</p>
        </div>
      </div>
    </div>
  );
}
