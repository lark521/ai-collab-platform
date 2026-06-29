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
  agent: { name: string; type: string };
  roleName: string;
  assignedAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

const priorityLabels: Record<string, string> = {
  low: '🟢 低',
  normal: '🔵 普通',
  high: '🟠 高',
  urgent: '🔴 紧急',
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [roleAssignments, setRoleAssignments] = useState<{ agentId: string; roleName: string }[]>([]);

  useEffect(() => {
    loadTasks();
    agentsApi.list().then((res: any) => setAgents(res.data));
  }, []);

  const loadTasks = async () => {
    const res: any = await tasksApi.list({ page: 1, size: 50 });
    setTasks(res.data.tasks);
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    await tasksApi.create({ title: newTitle, description: newDesc, priority: newPriority });
    setNewTitle('');
    setNewDesc('');
    setShowCreate(false);
    loadTasks();
  };

  const loadTaskDetail = async (taskId: string) => {
    const res: any = await tasksApi.get(taskId);
    setTaskDetail(res.data);
    setSelectedTask(tasks.find(t => t.id === taskId) || null);
  };

  const assignRole = async () => {
    for (const ra of roleAssignments) {
      await tasksApi.assignRole({
        taskId: selectedTask!.id,
        agentId: ra.agentId,
        roleName: ra.roleName,
      });
    }
    setRoleAssignments([]);
    loadTaskDetail(selectedTask!.id);
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await tasksApi.updateStatus(taskId, status);
    loadTasks();
    if (selectedTask?.id === taskId) {
      loadTaskDetail(taskId);
    }
  };

  return (
    <div className="p-6 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">📋 任务管理系统</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary rounded hover:bg-opacity-80 transition"
        >
          + 新建任务
        </button>
      </div>

      {/* 创建任务表单 */}
      {showCreate && (
        <div className="bg-surface rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">创建新任务</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="任务标题 *"
              className="px-4 py-2 bg-darker rounded border border-surface focus:border-primary outline-none"
            />
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              className="px-4 py-2 bg-darker rounded border border-surface focus:border-primary outline-none"
            >
              <option value="low">🟢 低优先级</option>
              <option value="normal">🔵 普通</option>
              <option value="high">🟠 高优先级</option>
              <option value="urgent">🔴 紧急</option>
            </select>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="任务描述"
              rows={3}
              className="col-span-2 px-4 py-2 bg-darker rounded border border-surface focus:border-primary outline-none"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createTask} className="px-6 py-2 bg-green-600 rounded hover:bg-opacity-80">
              创建
            </button>
            <button onClick={() => setShowCreate(false)} className="px-6 py-2 bg-surface rounded hover:bg-opacity-80">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="grid grid-cols-3 gap-4">
        {tasks.map(task => (
          <div
            key={task.id}
            className={`bg-surface rounded-lg p-4 cursor-pointer hover:border-primary border border-transparent transition ${
              selectedTask?.id === task.id ? 'border-primary' : ''
            }`}
            onClick={() => loadTaskDetail(task.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${statusColors[task.status]}`} />
              <span className="text-xs text-gray-400">{priorityLabels[task.priority]}</span>
            </div>
            <h4 className="font-semibold mb-1">{task.title}</h4>
            <div className="text-xs text-gray-500">
              {new Date(task.createdAt).toLocaleDateString()}
              {task.completedAt && ` · 完成于 ${new Date(task.completedAt).toLocaleDateString()}`}
            </div>
          </div>
        ))}
      </div>

      {/* 任务详情面板 */}
      {selectedTask && taskDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedTask(null)}>
          <div
            className="bg-darker rounded-xl p-6 w-[800px] max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{taskDetail.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* 状态控制 */}
            <div className="flex gap-2 mb-4">
              {['pending', 'running', 'completed', 'failed'].map(status => (
                <button
                  key={status}
                  onClick={() => updateTaskStatus(taskDetail.id, status)}
                  className={`px-3 py-1 rounded text-xs ${
                    taskDetail.status === status ? 'bg-primary text-white' : 'bg-surface hover:bg-surface/80'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* 角色分配 */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">👥 角色分配</h4>
              <div className="space-y-2">
                {taskDetail.taskRoles?.map((tr: TaskRole) => (
                  <div key={tr.id} className="flex items-center gap-3 bg-surface p-2 rounded">
                    <span className={`w-2 h-2 rounded-full ${
                      (tr.agent as any).status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium">{tr.agent.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">{tr.roleName}</span>
                    <span className="text-xs text-gray-500 ml-auto">{tr.agent.type}</span>
                  </div>
                ))}
              </div>
              
              {/* 添加角色 */}
              <div className="mt-3 flex gap-2">
                <select
                  value={roleAssignments[0]?.agentId || ''}
                  onChange={e => setRoleAssignments([{ ...roleAssignments[0]!, agentId: e.target.value }])}
                  className="px-3 py-1 bg-surface rounded text-sm"
                >
                  <option value="">选择 Agent...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select
                  value={roleAssignments[0]?.roleName || ''}
                  onChange={e => setRoleAssignments([{ ...roleAssignments[0]!, roleName: e.target.value }])}
                  className="px-3 py-1 bg-surface rounded text-sm"
                >
                  <option value="">选择角色...</option>
                  <option value="planner">策划</option>
                  <option value="executor">执行</option>
                  <option value="reviewer">审核</option>
                  <option value="tester">测试</option>
                </select>
                <button onClick={assignRole} className="px-3 py-1 bg-primary rounded text-sm">
                  分配
                </button>
              </div>
            </div>

            {/* 消息流 */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">💬 通信记录 ({taskDetail.messages?.length || 0})</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {taskDetail.messages?.slice(-10).reverse().map((msg: any) => (
                  <div key={msg.id} className="text-xs bg-surface p-2 rounded">
                    <span className="text-primary">{msg.sender?.name}</span>
                    {' → '}
                    <span className="text-secondary">{msg.receiver?.name || 'All'}</span>
                    <span className="text-gray-500 ml-2">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    <div className="text-gray-300 mt-1">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 审计日志 */}
            <div>
              <h4 className="font-semibold mb-2">🔍 操作日志 ({taskDetail.auditLogs?.length || 0})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {taskDetail.auditLogs?.slice(-10).reverse().map((log: any) => (
                  <div key={log.id} className="text-xs bg-surface p-2 rounded">
                    <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    {' · '}
                    <span className="text-primary">{log.agentId}</span>
                    {' · '}
                    <span>{log.action}</span>
                    <span className="text-gray-300 ml-2">{log.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
