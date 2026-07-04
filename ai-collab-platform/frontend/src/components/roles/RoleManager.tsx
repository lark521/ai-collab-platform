import { useState, useEffect } from 'react';
import { rolesApi } from '../../services/api';

interface Role {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  reportTo: string | null;
  responsibilities: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { taskRoles: number };
}

export default function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoles, setActiveRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [search, setSearch] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    description: '',
    promptTemplate: '',
    reportTo: '',
    responsibilities: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  const loadRoles = async () => {
    try {
      const res = await rolesApi.list({ search });
      setRoles(res.data || []);
    } catch (e) {
      console.error('Failed to load roles:', e);
    }
  };

  const loadActiveRoles = async () => {
    try {
      const res = await rolesApi.active();
      setActiveRoles(res.data || []);
    } catch (e) {
      console.error('Failed to load active roles:', e);
    }
  };

  useEffect(() => {
    loadRoles();
    loadActiveRoles();
  }, [search]);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      promptTemplate: '',
      reportTo: '',
      responsibilities: '',
      isActive: true,
    });
    setEditingRole(null);
    setShowForm(false);
    setFormErrors({});
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || '',
      promptTemplate: role.promptTemplate || '',
      reportTo: role.reportTo || '',
      responsibilities: role.responsibilities || '',
      isActive: role.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    // 前端表单验证
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = '角色名称不能为空';
    else if (form.name.length > 50) errors.name = '角色名称不能超过50个字符';
    
    // 检查名称格式（仅允许字母、数字、下划线、连字符）
    if (form.name && !/^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_-]*$/.test(form.name)) {
      errors.name = '名称只能包含字母、中文、数字、下划线和连字符';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    setLoading(true);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, form);
      } else {
        await rolesApi.create(form);
      }
      resetForm();
      loadRoles();
      loadActiveRoles();
    } catch (e: any) {
      alert(`保存失败: ${e.response?.data?.message || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此角色？')) return;
    try {
      await rolesApi.delete(id);
      loadRoles();
      loadActiveRoles();
    } catch (e: any) {
      alert(`删除失败: ${e.response?.data?.message || e.message}`);
    }
  };

  const toggleActive = async (role: Role) => {
    try {
      await rolesApi.update(role.id, { isActive: !role.isActive });
      loadRoles();
      loadActiveRoles();
    } catch (e: any) {
      alert(`更新失败: ${e.response?.data?.message || e.message}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gradient">🎭 角色管理</h2>
          <p className="text-xs text-gray-500 mt-1">定义和管理 AI Agent 的角色配置</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索角色..."
            className="px-3 py-2 bg-[#0f1629] border border-gray-700/50 rounded-lg text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500 w-48"
          />
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
          >
            + 新建角色
          </button>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
          <div className="text-xs text-gray-400">全部角色</div>
          <div className="text-2xl font-bold">{roles.length}</div>
        </div>
        <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10">
          <div className="text-xs text-gray-400">活跃角色</div>
          <div className="text-2xl font-bold">{activeRoles.length}</div>
        </div>
        <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <div className="text-xs text-gray-400">已分配</div>
          <div className="text-2xl font-bold">{roles.reduce((sum, r) => sum + (r._count?.taskRoles || 0), 0)}</div>
        </div>
        <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <div className="text-xs text-gray-400">预设角色</div>
          <div className="text-2xl font-bold">4</div>
        </div>
      </div>

      {/* 角色列表 */}
      <div className="grid grid-cols-2 gap-4">
        {roles.map(role => (
          <div
            key={role.id}
            className={`glass-card rounded-xl p-5 transition-all duration-200 hover:scale-[1.01] ${
              !role.isActive ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${role.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                <h3 className="text-base font-bold text-gray-200 capitalize">{role.name}</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleActive(role)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 text-xs transition"
                  title={role.isActive ? '停用' : '启用'}
                >
                  {role.isActive ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => handleEdit(role)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 text-xs transition"
                  title="编辑"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 text-xs transition"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {role.description && (
                <div>
                  <span className="text-gray-500">描述：</span>
                  <span className="text-gray-300">{role.description}</span>
                </div>
              )}
              {role.reportTo && (
                <div>
                  <span className="text-gray-500">汇报对象：</span>
                  <span className="text-indigo-300">{role.reportTo}</span>
                </div>
              )}
              {role.responsibilities && (
                <div>
                  <span className="text-gray-500">职责：</span>
                  <span className="text-gray-300">{role.responsibilities}</span>
                </div>
              )}
              {role.promptTemplate && (
                <div className="mt-2 p-2 bg-[#0f1629] rounded border border-gray-700/30">
                  <span className="text-gray-500">Prompt：</span>
                  <p className="text-gray-400 mt-1 line-clamp-2">{role.promptTemplate}</p>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
              <span>已分配 {role._count?.taskRoles || 0} 次</span>
              <span>{new Date(role.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-600">
            <div className="text-4xl mb-3 opacity-30">🎭</div>
            <div className="text-sm">暂无角色</div>
          </div>
        )}
      </div>

      {/* 编辑/创建表单 Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={resetForm}>
          <div
            className="bg-[#0f1629] rounded-2xl border border-indigo-500/20 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-indigo-500/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gradient">
                {editingRole ? '编辑角色' : '新建角色'}
              </h3>
              <button onClick={resetForm} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">角色名称 *</label>
                  <input
                    value={form.name}
                    onChange={e => { setForm({ ...form, name: e.target.value }); setFormErrors(prev => ({ ...prev, name: '' })); }}
                    placeholder="如: planner, executor"
                    className={`w-full px-3 py-2 bg-[#1e293b] border rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:ring-2 ${
                      formErrors.name ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700/50 focus:border-indigo-500 focus:ring-indigo-500/30'
                    }`}
                  />
                  {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#1e293b] border-gray-700 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-300">启用此角色</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">角色描述</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="简要描述此角色的用途"
                  className="w-full px-3 py-2 bg-[#1e293b] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">汇报对象角色</label>
                <input
                  value={form.reportTo}
                  onChange={e => setForm({ ...form, reportTo: e.target.value })}
                  placeholder="如: planner (选填)"
                  className="w-full px-3 py-2 bg-[#1e293b] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">工作内容 / 职责</label>
                <textarea
                  value={form.responsibilities}
                  onChange={e => setForm({ ...form, responsibilities: e.target.value })}
                  placeholder="描述此角色的主要工作职责"
                  rows={2}
                  className="w-full px-3 py-2 bg-[#1e293b] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Prompt 模板</label>
                <textarea
                  value={form.promptTemplate}
                  onChange={e => setForm({ ...form, promptTemplate: e.target.value })}
                  placeholder="此角色的系统提示词模板，将用于 AI Agent 的任务指令"
                  rows={6}
                  className="w-full px-3 py-2 bg-[#1e293b] border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-indigo-500/10 flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="px-5 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.name.trim() || Object.keys(formErrors).length > 0}
                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? '保存中...' : editingRole ? '保存修改' : '创建角色'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
