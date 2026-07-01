import { useState, useEffect } from 'react';
import { tasksApi, agentsApi } from '../../services/api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
}

interface TaskRole {
  id: string;
  agentId: string;
  agent: { name: string; type: string; status?: string };
  roleName: string;
  assignedAt: string;
}

interface TaskDetail {
  title: string;
  description?: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
  taskRoles?: TaskRole[];
  messages?: any[];
  auditLogs?: any[];
  testResults?: any[];
  id: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  running: { label: '进行中', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  completed: { label: '已完成', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  failed: { label: '失败', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
};

const PRIORITY_CONFIG: Record<string, { label: string; emoji: string }> = {
  low: { label: '低', emoji: '🟢' },
  normal: { label: '普通', emoji: '🔵' },
  high: { label: '高', emoji: '🟠' },
  urgent: { label: '紧急', emoji: '🔴' },
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [roleAgentId, setRoleAgentId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
    agentsApi.list().then((res: any) => setAgents(res.data || []));
  }, []);

  const loadTasks = async () => {
    try {
      const params: any = { page: 1, size: 50 };
      if (filterStatus !== 'all') params.status = filterStatus;
      const res: any = await tasksApi.list(params);
      setTasks(res.data?.tasks || res.data || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      await tasksApi.create({ title: newTitle.trim(), description: newDesc.trim(), priority: newPriority });
      setNewTitle('');
      setNewDesc('');
      setShowCreate(false);
      loadTasks();
    } catch (e: any) {
      alert(`创建失败: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDetail = async (taskId: string) => {
    try {
      const res: any = await tasksApi.get(taskId);
      setTaskDetail(res.data);
      setSelectedTask(tasks.find(t => t.id === taskId) || null);
    } catch (e) {
      console.error('Failed to load task detail:', e);
    }
  };

  const assignRole = async () => {
    if (!roleAgentId || !roleName || !selectedTask) return;
    try {
      await tasksApi.assignRole({ taskId: selectedTask.id, agentId: roleAgentId, roleName });
      setRoleAgentId('');
      setRoleName('');
      loadTaskDetail(selectedTask.id);
    } catch (e: any) {
      alert(`分配失败: ${e.response?.data?.message || e.message}`);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await tasksApi.updateStatus(taskId, status);
      loadTasks();
      if (selectedTask?.id === taskId) loadTaskDetail(taskId);
    } catch (e: any) {
      alert(`状态更新失败: ${e.response?.data?.message || e.message}`);
    }
  };

  const filteredTasks = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gradient">📋 任务管理</h2>
          <p className="text-xs text-gray-500 mt-1">管理和跟踪 AI Agent 协作任务</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
        >
          + 新建任务
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '全部', value: stats.total, color: 'from-indigo-500 to-blue-500', shadow: 'shadow-indigo-500/20' },
          { label: '待处理', value: stats.pending, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
          { label: '进行中', value: stats.running, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
          { label: '已完成', value: stats.completed, color: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/20' },
          { label: '失败', value: stats.failed, color: 'from-red-500 to-pink-500', shadow: 'shadow-red-500/20' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} bg-opacity-10 glass-card rounded-xl p-4 animate-fade-in`}>
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex gap-2">
        {['all', 'pending', 'running', 'completed', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${
              filterStatus === s
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            {s === 'all' ? '全部' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* 创建表单 */}
      {showCreate && (
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">创建新任务</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="任务标题 *"
              className="px-4 py-2.5 bg-[#0f1629] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
              autoFocus
            />
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="px-4 py-2.5 bg-[#0f1629] border border-gray-700/50 rounded-lg text-sm text-white focus:border-indigo-500 outline-none"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="任务描述（可选）"
              rows={3}
              className="col-span-2 px-4 py-2.5 bg-[#0f1629] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createTask} disabled={loading} className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50">
              {loading ? '创建中...' : '创建'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-5 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="grid grid-cols-3 gap-4">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            onClick={() => loadTaskDetail(task.id)}
            className={`glass-card rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
              selectedTask?.id === task.id ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_CONFIG[task.status]?.bg || 'bg-gray-500/10'}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  task.status === 'completed' ? 'bg-emerald-400' :
                  task.status === 'running' ? 'bg-blue-400 animate-pulse' :
                  task.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                {STATUS_CONFIG[task.status]?.label || task.status}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {PRIORITY_CONFIG[task.priority]?.emoji} {PRIORITY_CONFIG[task.priority]?.label}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-gray-200 mb-2 line-clamp-2">{task.title}</h4>
            <div className="text-xs text-gray-500">
              {new Date(task.createdAt).toLocaleDateString('zh-CN')}
              {task.completedAt && <span className="ml-2 text-emerald-400">→ {new Date(task.completedAt).toLocaleDateString('zh-CN')}</span>}
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-600">
            <div className="text-4xl mb-3 opacity-30">📋</div>
            <div className="text-sm">暂无任务</div>
          </div>
        )}
      </div>

      {/* 任务详情 Modal */}
      {selectedTask && taskDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setSelectedTask(null)}>
          <div
            className="bg-[#0f1629] rounded-2xl border border-indigo-500/20 w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-indigo-500/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gradient">{taskDetail.title}</h3>
                <p className="text-xs text-gray-500 mt-1">创建于 {new Date(taskDetail.createdAt).toLocaleString('zh-CN')}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-6 py-4 space-y-5">
              {/* 状态切换 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">状态</h4>
                <div className="flex gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => updateTaskStatus(taskDetail.id, key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        taskDetail.status === key
                          ? `${cfg.bg} ${cfg.color} border`
                          : 'bg-white/5 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 角色分配 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">👥 角色分配</h4>
                <div className="space-y-2">
                  {taskDetail.taskRoles?.map((tr: TaskRole) => (
                    <div key={tr.id} className="flex items-center gap-3 bg-[#1e293b]/50 p-3 rounded-lg border border-indigo-500/10">
                      <div className={`w-2 h-2 rounded-full ${(tr.agent as any).status === 'online' || (tr.agent as any).isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-sm font-medium text-gray-200">{tr.agent.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full">{tr.roleName}</span>
                      <span className="text-xs text-gray-500 ml-auto">{tr.agent.type}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <select
                      value={roleAgentId}
                      onChange={e => setRoleAgentId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#1e293b] border border-gray-700/50 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="">选择 Agent...</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select
                      value={roleName}
                      onChange={e => setRoleName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#1e293b] border border-gray-700/50 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="">选择角色...</option>
                      <option value="planner">策划</option>
                      <option value="executor">执行</option>
                      <option value="reviewer">审核</option>
                      <option value="tester">测试</option>
                    </select>
                    <button onClick={assignRole} disabled={!roleAgentId || !roleName} className="px-4 py-2 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-400 transition disabled:opacity-30">
                      分配
                    </button>
                  </div>
                </div>
              </div>

              {/* 消息流 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">💬 通信记录 ({taskDetail.messages?.length || 0})</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {taskDetail.messages?.slice(-15).reverse().map((msg: any) => (
                    <div key={msg.id} className="text-xs bg-[#1e293b]/30 p-2.5 rounded-lg border border-indigo-500/5">
                      <span className="text-indigo-400 font-medium">{msg.sender?.name || msg.senderId}</span>
                      {' → '}
                      <span className="text-purple-400">{msg.receiver?.name || 'All'}</span>
                      <span className="text-gray-600 ml-2">{new Date(msg.timestamp).toLocaleTimeString('zh-CN')}</span>
                      <div className="text-gray-400 mt-1">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 审计日志 */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">🔍 操作日志 ({taskDetail.auditLogs?.length || 0})</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {taskDetail.auditLogs?.slice(-10).reverse().map((log: any) => (
                    <div key={log.id} className="text-xs bg-[#1e293b]/30 p-2 rounded-lg">
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString('zh-CN')}</span>
                      {' · '}
                      <span className="text-indigo-400">{log.agentId}</span>
                      {' · '}
                      <span className="text-gray-300">{log.action}</span>
                      <span className="text-gray-500 ml-2">{log.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
