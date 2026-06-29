import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { agentsApi, messagesApi } from '../../services/api';

interface Message {
  id: string;
  senderId: string;
  sender?: { name: string };
  receiverId?: string;
  receiver?: { name: string };
  content: string;
  msgType: string;
  taskId?: string;
  timestamp: string;
}

export default function ChatView() {
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 加载 Agent 列表
    agentsApi.online().then((res: any) => setAgents(res.data));

    // 加载历史消息
    messagesApi.all(100).then((res: any) => setMessages(res.data));

    // Socket 连接状态
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // 接收新消息
    socket.on('message:new', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    // Agent 上线/下线
    socket.on('agent:status', (data: any) => {
      console.log('Agent status change:', data);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message:new');
      socket.off('agent:status');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputText.trim() || !selectedAgent) return;

    if (socket.connected) {
      socket.emit('message:send', {
        to: selectedAgent,
        content: inputText,
        msgType: 'text',
      });
    }

    setInputText('');
  };

  const registerAgent = async () => {
    try {
      const name = prompt('请输入 Agent 名称:');
      if (!name) return;
      const type = prompt('Agent 类型 (openclaw/hermes/custom):', 'openclaw');
      if (!type) return;

      const res: any = await agentsApi.create({ name, type });
      setAgents(prev => [...prev, { ...res.data, status: 'online' }]);
      alert(`Agent "${name}" 注册成功，ID: ${res.data.id}`);
    } catch (e) {
      alert('注册失败');
    }
  };

  return (
    <div className="flex h-screen bg-darker">
      {/* 左侧边栏 - Agent 列表 */}
      <div className="w-64 border-r border-surface p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-4 text-primary">🤖 Agents</h2>
        <button
          onClick={registerAgent}
          className="mb-4 px-3 py-2 bg-primary rounded hover:bg-opacity-80 transition"
        >
          + 注册 Agent
        </button>
        <div className="flex-1 overflow-y-auto space-y-2">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`p-2 rounded cursor-pointer flex items-center gap-2 ${
                selectedAgent === agent.id ? 'bg-surface' : 'hover:bg-surface/50'
              }`}
              onClick={() => setSelectedAgent(agent.id)}
            >
              <span className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <div className="text-sm font-medium">{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.type}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {connected ? '🟢 已连接' : '🔴 未连接'}
        </div>
      </div>

      {/* 主聊天区 */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-surface">
          <h3 className="font-semibold">
            {selectedAgent ? agents.find(a => a.id === selectedAgent)?.name : '选择 Agent 开始对话'}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages
            .filter(m => !selectedAgent || m.receiverId === selectedAgent || m.senderId === selectedAgent)
            .slice(-50)
            .map(msg => (
              <div key={msg.id} className={`flex ${msg.senderId === selectedAgent ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-md p-3 rounded-lg ${
                  msg.senderId === selectedAgent
                    ? 'bg-surface text-left'
                    : 'bg-primary text-white'
                }`}>
                  <div className="text-xs opacity-70 mb-1">
                    {msg.sender?.name || msg.senderId} → {msg.receiver?.name || 'All'}
                    {' · '}
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm">{msg.content}</div>
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-surface flex gap-2">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={selectedAgent ? '输入消息...' : '请先选择 Agent'}
            disabled={!selectedAgent}
            className="flex-1 px-4 py-2 bg-surface rounded border border-surface focus:border-primary outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!selectedAgent || !inputText.trim()}
            className="px-6 py-2 bg-primary rounded hover:bg-opacity-80 transition disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
