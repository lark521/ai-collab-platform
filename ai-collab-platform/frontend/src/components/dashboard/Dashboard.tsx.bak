import { useState } from 'react';
import ChatView from '../chat/ChatView';
import TaskManager from '../tasks/TaskManager';
import VisualizationView from '../visualization/VizView';
import ReportView from './ReportView';
import AgentManagement from '../agents/AgentManagement';

type Tab = 'chat' | 'tasks' | 'agents' | 'viz' | 'report';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'chat', label: '通信', icon: '💬' },
    { key: 'tasks', label: '任务管理', icon: '📋' },
    { key: 'agents', label: 'Agent 管理', icon: '🤖' },
    { key: 'viz', label: '可视化', icon: '📊' },
    { key: 'report', label: '结果报告', icon: '📝' },
  ];

  return (
    <div className="flex h-screen bg-darker">
      {/* 侧边导航 */}
      <div className="w-16 bg-dark flex flex-col items-center py-4 border-r border-surface">
        <div className="text-2xl mb-8">🤖</div>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`w-12 h-12 rounded-lg mb-2 flex items-center justify-center text-lg transition ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:bg-surface hover:text-white'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'tasks' && <TaskManager />}
        {activeTab === 'agents' && <AgentManagement />}
        {activeTab === 'viz' && <VisualizationView />}
        {activeTab === 'report' && <ReportView />}
      </div>
    </div>
  );
}
