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
  x?: number;
  y?: number;
}

export default function VisualizationView() {
  const socket = useSocket();
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<any>(null);
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('all');

  useEffect(() => {
    // 初始化图表
    if (chartRef.current) {
      const echartsInstance = echarts.init(chartRef.current, 'dark');
      setChart(echartsInstance);
    }

    // 加载数据
    agentsApi.list().then((res: any) => {
      const agentsData = res.data;
      setAgents(agentsData);
      updateChart(agentsData, []);
    });

    messagesApi.all(200).then((res: any) => {
      setMessages(res.data);
    });

    // 实时消息
    socket.on('message:new', (msg: Message) => {
      setMessages(prev => [...prev.slice(-200), msg]);
    });

    socket.on('agent:status', () => {
      agentsApi.list().then((res: any) => {
        setAgents(res.data);
      });
    });

    return () => {
      socket.off('message:new');
      socket.off('agent:status');
      chart?.dispose();
    };
  }, [socket]);

  const updateChart = (agents: AgentNode[], msgs: Message[]) => {
    if (!chart) return;

    // 计算节点位置（环形布局）
    const nodes = agents.map((agent, i) => {
      const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
      const radius = 250;
      return {
        ...agent,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      };
    });

    // 构建边（消息流向）
    const edges: any[] = [];
    const agentMsgCounts: Record<string, any> = {};
    msgs.forEach(msg => {
      if (msg.receiverId && msg.senderId !== msg.receiverId) {
        const key = `${msg.senderId}->${msg.receiverId}`;
        if (!agentMsgCounts[key]) {
          agentMsgCounts[key] = { source: msg.senderId, target: msg.receiverId, value: 0 };
        }
        agentMsgCounts[key].value++;
      }
    });
    Object.values(agentMsgCounts).forEach(e => edges.push(e));

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `${params.data.name}<br/>类型: ${params.data.type}<br/>状态: ${params.data.status}`;
          }
          return `${params.data.source} → ${params.data.target}<br/>消息数: ${params.data.value}`;
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'none',
          symbolSize: 60,
          roam: true,
          label: {
            show: true,
            fontSize: 12,
            color: '#fff',
          },
          edgeSymbol: ['arrow', 'none'],
          edgeSymbolSize: [8, 4],
          data: nodes.map(n => ({
            ...n,
            itemStyle: {
              color: n.status === 'online' ? '#22c55e' : '#ef4444',
              borderColor: n.status === 'online' ? '#4ade80' : '#f87171',
              borderWidth: 2,
            },
          })),
          links: edges.map(e => ({
            source: e.source,
            target: e.target,
            lineStyle: {
              color: '#6366f1',
              width: 2,
              curveness: 0.3,
            },
          })),
          lineStyle: {
            color: '#6366f1',
            curveness: 0.3,
          },
        },
        {
          // 消息流时间线
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: msgs.slice(-100).map(m => new Date(m.timestamp).getTime()),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#8b5cf6', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139,92,246,0.3)' },
              { offset: 1, color: 'rgba(139,92,246,0)' },
            ]),
          },
        },
      ],
      grid: [{ left: 0, right: '10%', top: 0, bottom: 0 }],
    };

    chart.setOption(option);
  };

  useEffect(() => {
    updateChart(agents, messages);
  }, [agents, messages]);

  return (
    <div className="p-6 h-screen flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-primary">📊 通信可视化面板</h2>
      
      {/* Agent 状态卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <div className="text-sm text-gray-400">总 Agent 数</div>
          <div className="text-3xl font-bold text-white">{agents.length}</div>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <div className="text-sm text-gray-400">在线 Agent</div>
          <div className="text-3xl font-bold text-green-500">
            {agents.filter(a => a.status === 'online').length}
          </div>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <div className="text-sm text-gray-400">消息总数</div>
          <div className="text-3xl font-bold text-blue-500">{messages.length}</div>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <div className="text-sm text-gray-400">今日消息</div>
          <div className="text-3xl font-bold text-purple-500">
            {messages.filter(m => {
              const d = new Date(m.timestamp);
              const today = new Date();
              return d.toDateString() === today.toDateString();
            }).length}
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="flex-1 grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface rounded-lg p-4" style={{ minHeight: 400 }}>
          <h3 className="text-sm font-semibold mb-2 text-gray-400">Agent 通信拓扑图</h3>
          <div ref={chartRef} style={{ width: '100%', height: 400 }} />
        </div>
        <div className="bg-surface rounded-lg p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2 text-gray-400">实时消息流</h3>
          <div className="space-y-2">
            {messages.slice(-20).reverse().map(msg => (
              <div key={msg.id} className="text-xs p-2 bg-darker rounded">
                <span className="text-primary font-medium">
                  {msg.sender?.name || msg.senderId}
                </span>
                {' → '}
                <span className="text-secondary">
                  {msg.receiver?.name || 'All'}
                </span>
                <div className="text-gray-400 mt-1 truncate">{msg.content}</div>
                <div className="text-gray-600 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
