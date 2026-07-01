import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { agentsApi, messagesApi } from '../../services/api';
import * as echarts from 'echarts';

interface Message {
  id: string;
  senderId: string;
  sender?: { name: string; type: string };
  receiverId?: string;
  receiver?: { name: string; type: string };
  content: string;
  msgType: string;
  taskId?: string;
  timestamp: string;
}

interface AgentNode {
  id: string;
  name: string;
  type: string;
  status: string;
  isConnected?: boolean;
  lastHeartbeat?: string;
}

const TYPE_EMOJI: Record<string, string> = {
  openclaw: '🦝',
  hermes: '🦙',
  custom: '🤖',
};

export default function VisualizationView() {
  const socket = useSocket();
  const graphRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [graphChart, setGraphChart] = useState<any>(null);
  const [flowChart, setFlowChart] = useState<any>(null);
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Init charts
    if (graphRef.current) {
      const g = echarts.init(graphRef.current, 'dark');
      setGraphChart(g);
    }
    if (chartRef.current) {
      const f = echarts.init(chartRef.current, 'dark');
      setFlowChart(f);
    }

    // Load data
    agentsApi.list().then((res: any) => {
      const data = res.data || [];
      setAgents(data);
      updateCharts(data, []);
    });

    messagesApi.all(200).then((res: any) => {
      setMessages(res.data || []);
    });

    socket.on('message:new', (msg: Message) => {
      setMessages(prev => [...prev.slice(-200), msg]);
    });

    socket.on('agent:status', () => {
      agentsApi.list().then((res: any) => setAgents(res.data || []));
    });

    // Resize handler
    const handleResize = () => {
      graphChart?.resize();
      flowChart?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      socket.off('message:new');
      socket.off('agent:status');
      graphChart?.dispose();
      flowChart?.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [socket]);

  const updateCharts = (agentsData: AgentNode[], msgs: Message[]) => {
    // Graph chart
    if (graphChart) {
      const nodes = agentsData.map((agent, i) => {
        const angle = (2 * Math.PI * i) / Math.max(agentsData.length, 1) - Math.PI / 2;
        const radius = Math.min(agentsData.length > 8 ? 280 : 200, agentsData.length * 30);
        return {
          id: agent.id,
          name: agent.name,
          value: agent.type,
          symbolSize: Math.max(35, Math.min(55, 30 + (agent.status === 'online' || agent.isConnected ? 10 : 0))),
          x: 350 + radius * Math.cos(angle),
          y: 280 + radius * Math.sin(angle),
          status: agent.status,
          isConnected: agent.isConnected,
          lastHeartbeat: agent.lastHeartbeat,
          itemStyle: {
            color: (agent.status === 'online' || agent.isConnected)
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
            borderColor: (agent.status === 'online' || agent.isConnected)
              ? '#10b981'
              : '#ef4444',
            borderWidth: 2,
            shadowColor: (agent.status === 'online' || agent.isConnected)
              ? 'rgba(16, 185, 129, 0.4)'
              : 'rgba(239, 68, 68, 0.4)',
            shadowBlur: 12,
          },
          label: {
            show: true,
            fontSize: 11,
            color: '#e2e8f0',
            fontWeight: 500,
          },
        };
      });

      const edges: any[] = [];
      const edgeMap: Record<string, number> = {};
      msgs.forEach(msg => {
        if (msg.receiverId && msg.senderId !== msg.receiverId) {
          const key = `${msg.senderId}->${msg.receiverId}`;
          edgeMap[key] = (edgeMap[key] || 0) + 1;
        }
      });
      Object.entries(edgeMap).forEach(([key, value]) => {
        const [source, target] = key.split('->');
        edges.push({ source, target, value, lineStyle: {
          color: 'rgba(99, 102, 241, 0.4)',
          width: Math.min(1 + value * 0.5, 4),
          curveness: 0.3,
          type: value > 3 ? 'solid' : 'dashed',
        }});
      });

      graphChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          textStyle: { color: '#e2e8f0', fontSize: 12 },
          formatter: (params: any) => {
            if (params.dataType === 'node') {
              const isOnline = params.data.status === 'online' || params.data.isConnected;
              return `<b>${params.data.name}</b><br/>类型: ${params.data.value}<br/>状态: ${isOnline ? '🟢 在线' : '🔴 离线'}<br/>ID: ${params.data.id.slice(0, 8)}...`;
            }
            return `${params.data.source} → ${params.data.target}<br/>消息数: ${params.data.value}`;
          },
        },
        series: [{
          type: 'graph',
          layout: 'none',
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          data: nodes,
          links: edges,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [6, 5],
          lineStyle: { color: 'rgba(99, 102, 241, 0.3)', curveness: 0.3 },
          label: { show: true, fontSize: 11, color: '#e2e8f0' },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4 },
            itemStyle: { shadowBlur: 20, shadowColor: 'rgba(99, 102, 241, 0.5)' },
          },
        }],
      });
    }

    // Flow chart
    if (flowChart) {
      const hourMap: Record<string, number> = {};
      msgs.forEach(msg => {
        const d = new Date(msg.timestamp);
        const hour = d.getHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      });
      const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      const flowData = hours.map((_, i) => hourMap[i] || 0);

      flowChart.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          textStyle: { color: '#e2e8f0', fontSize: 12 },
          axisPointer: { type: 'shadow' },
        },
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: {
          type: 'category',
          data: hours,
          axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
          axisLabel: { color: '#64748b', fontSize: 10 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
        },
        series: [{
          type: 'bar',
          data: flowData.map((v, i) => ({
            value: v,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: v > 0 ? '#818cf8' : '#334155' },
                { offset: 1, color: v > 0 ? '#6366f1' : '#1e293b' },
              ]),
              borderRadius: v > 0 ? [4, 4, 0, 0] : 0,
            },
          })),
          barWidth: '60%',
          animationDuration: 800,
        }],
      });
    }
  };

  useEffect(() => {
    updateCharts(agents, messages);
  }, [agents, messages]);

  const onlineCount = agents.filter(a => a.status === 'online' || a.isConnected).length;
  const todayMsgs = messages.filter(m => {
    const d = new Date(m.timestamp);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gradient">📊 通信可视化</h2>
          <p className="text-xs text-gray-500 mt-1">实时 Agent 通信拓扑与消息流量分析</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Agent 总数', value: agents.length, icon: '🤖', gradient: 'from-indigo-500/20 to-blue-500/20' },
          { label: '在线 Agent', value: onlineCount, icon: '🟢', gradient: 'from-emerald-500/20 to-green-500/20' },
          { label: '消息总数', value: messages.length, icon: '💬', gradient: 'from-purple-500/20 to-pink-500/20' },
          { label: '今日消息', value: todayMsgs, icon: '📈', gradient: 'from-amber-500/20 to-orange-500/20' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.gradient} glass-card rounded-xl p-4 animate-fade-in`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <div>
                <div className="text-xs text-gray-400">{card.label}</div>
                <div className="text-2xl font-bold text-white">{card.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4" style={{ minHeight: 0 }}>
        <div className="col-span-2 glass-card rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">🕸️ Agent 通信拓扑</h3>
          <div ref={graphRef} style={{ width: '100%', height: 380 }} />
        </div>
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">📈 24小时消息分布</h3>
          <div ref={chartRef} style={{ width: '100%', height: 380 }} />
        </div>
      </div>

      {/* Recent messages */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">🔔 最近消息流</h3>
        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
          {messages.slice(-20).reverse().map(msg => (
            <div key={msg.id} className="text-xs p-3 bg-[#1e293b]/40 rounded-lg border border-indigo-500/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-indigo-400 font-medium">
                  {msg.sender?.name || msg.senderId}
                </span>
                <span className="text-gray-600">→</span>
                <span className="text-purple-400">
                  {msg.receiver?.name || 'All'}
                </span>
                <span className="text-gray-600 ml-auto text-[10px]">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
                </span>
              </div>
              <div className="text-gray-400 truncate">{msg.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
