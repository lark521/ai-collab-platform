import { useState } from 'react';
import ChatView from '../chat/ChatView';
import TaskManager from '../tasks/TaskManager';
import VisualizationView from '../visualization/VizView';
import ReportView from './ReportView';
import AgentManagement from '../agents/AgentManagement';

type Tab = 'chat' | 'tasks' | 'agents' | 'viz' | 'report';

const TABS: { key: Tab; label: string; icon: string; desc: string }[] = [
  { key: 'chat', label: '通信', icon: '💬', desc: '实时消息' },
  { key: 'tasks', label: '任务', icon: '📋', desc: '任务管理' },
  { key: 'agents', label: 'Agent', icon: '🤖', desc: '节点管理' },
  { key: 'viz', label: '可视化', icon: '📊', desc: '拓扑分析' },
  { key: 'report', label: '报告', icon: '📝', desc: '结果报告' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);

  return (
    <div className="flex h-screen bg-[#0a0e1a] bg-grid-pattern">
      {/* 侧边导航 */}
      <div className="w-20 bg-[#0f1629]/90 backdrop-blur-xl flex flex-col items-center py-6 border-r border-indigo-500/10 z-20">
        {/* Logo */}
        <div className="mb-10 relative group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
            🤖
          </div>
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0f1629] animate-pulse" />
        </div>

        {/* Tab buttons */}
        <div className="flex flex-col gap-2 flex-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const isHovered = hoveredTab === tab.key;
            return (
              <div key={tab.key} className="relative">
                <button
                  onClick={() => setActiveTab(tab.key)}
                  onMouseEnter={() => setHoveredTab(tab.key)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500/90 to-purple-600/90 text-white shadow-lg shadow-indigo-500/25 scale-105'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                  title={`${tab.label} — ${tab.desc}`}
                >
                  {tab.icon}
                </button>
                {/* Tooltip */}
                {isHovered && !isActive && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1e293b] text-white text-xs rounded-lg shadow-xl border border-white/10 whitespace-nowrap z-50 animate-fade-in">
                    {tab.label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1e293b]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom status */}
        <div className="mt-auto pt-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden relative">
        {/* Top bar */}
        <div className="h-14 bg-[#0f1629]/60 backdrop-blur-xl border-b border-indigo-500/10 flex items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg">{TABS.find(t => t.key === activeTab)?.icon}</span>
            <h1 className="text-lg font-semibold text-gradient">{TABS.find(t => t.key === activeTab)?.label}</h1>
            <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded-full">
              {TABS.find(t => t.key === activeTab)?.desc}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-500">AI Collab Platform v1.0</span>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-3.5rem)] overflow-hidden animate-fade-in">
          {activeTab === 'chat' && <ChatView />}
          {activeTab === 'tasks' && <TaskManager />}
          {activeTab === 'agents' && <AgentManagement />}
          {activeTab === 'viz' && <VisualizationView />}
          {activeTab === 'report' && <ReportView />}
        </div>
      </div>
    </div>
  );
}
