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

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  isConnected?: boolean;
  lastHeartbeat?: string;
}

const TYPE_LABELS: Record<string, string> = {
  openclaw: '🦝',
  hermes: '🦙',
  custom: '🤖',
};

export default function ChatView() {
  const socket = useSocket();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState('openclaw');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const filteredMessages = selectedAgentId
    ? messages.filter(m => 
        m.senderId === selectedAgentId || 
        m.receiverId === selectedAgentId ||
        m.id?.startsWith?.('local-')
      )
    : [];

  useEffect(() => {
    loadAgents();
    loadMessages();
    setConnected(socket.connected);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:new', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('agent:status', () => {
      loadAgents();
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
  }, [filteredMessages.length]);

  const loadAgents = async () => {
    try {
      const res: any = await agentsApi.list();
      setAgents(res.data || []);
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  };

  const loadMessages = async () => {
    try {
      const res: any = await messagesApi.all(200);
      setMessages(res.data || []);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedAgentId) return;
    setSending(true);
    try {
      // Send via REST API to persist in DB
      const res: any = await messagesApi.create({
        senderId: selectedAgentId,
        receiverId: selectedAgentId,
        content: inputText.trim(),
        msgType: 'text',
      });
      
      // Reload messages to get the persisted one
      await loadMessages();
      setInputText('');
    } catch (e: any) {
      console.error('Send failed:', e);
      // Fallback: show locally anyway
      setMessages(prev => [...prev, {
        id: `local-${Date.now()}`,
        senderId: 'me',
        sender: { name: '我' },
        receiverId: selectedAgentId,
        receiver: selectedAgent,
        content: inputText.trim(),
        msgType: 'text',
        timestamp: new Date().toISOString(),
      }]);
      setInputText('');
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async () => {
    if (!newAgentName.trim()) return;
    try {
      const res: any = await agentsApi.create({ name: newAgentName.trim(), type: newAgentType });
      setAgents(prev => [...prev, { ...res.data, status: 'online' }]);
      setNewAgentName('');
      setShowRegister(false);
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || '注册失败';
      alert(`注册失败: ${msg}`);
    }
  };

  const onlineCount = agents.filter(a => a.status === 'online' || a.isConnected).length;

  return (
    <div className="flex h-full">
      {/* 左侧 Agent 列表 */}
      <div className="w-72 bg-[#0f1629]/80 backdrop-blur-xl border-r border-indigo-500/10 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-indigo-500/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">🤖 Agents</h2>
            <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full">
              {agents.length} 个
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRegister(!showRegister)}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs rounded-lg hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
            >
              + 注册 Agent
            </button>
          </div>
          {/* 注册表单 */}
          {showRegister && (
            <div className="mt-3 p-3 bg-[#1e293b]/80 rounded-lg border border-indigo-500/20 animate-fade-in">
              <input
                value={newAgentName}
                onChange={e => setNewAgentName(e.target.value)}
                placeholder="Agent 名称"
                className="w-full mb-2 px-3 py-2 bg-[#0f1629] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-indigo-500 outline-none"
                autoFocus
              />
              <select
                value={newAgentType}
                onChange={e => setNewAgentType(e.target.value)}
                className="w-full mb-2 px-3 py-2 bg-[#0f1629] border border-gray-700 rounded-lg text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="openclaw">🦝 OpenClaw</option>
                <option value="hermes">🦙 Hermes</option>
                <option value="custom">🤖 Custom</option>
              </select>
              <div className="flex gap-2">
                <button onClick={handleRegister} className="flex-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500 transition">
                  创建
                </button>
                <button onClick={() => setShowRegister(false)} className="flex-1 px-3 py-1.5 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-600 transition">
                  取消
                </button>
              </div>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-gray-400">在线 {onlineCount}/{agents.length}</span>
          </div>
        </div>

        {/* Agent 列表 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs">
              <div className="text-3xl mb-2">📡</div>
              暂无 Agent
            </div>
          ) : (
            agents.map(agent => (
              <div
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  inputRef.current?.focus();
                }}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedAgentId === agent.id
                    ? 'bg-indigo-500/20 border border-indigo-500/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${
                      (agent.status === 'online' || agent.isConnected)
                        ? 'bg-emerald-500/20'
                        : 'bg-red-500/20'
                    }`}>
                      {TYPE_LABELS[agent.type] || '🤖'}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f1629] ${
                      agent.status === 'online' || agent.isConnected ? 'bg-emerald-400' : 'bg-red-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{agent.name}</div>
                    <div className="text-xs text-gray-500">{agent.type}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部连接状态 */}
        <div className="p-3 border-t border-indigo-500/10">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
              {connected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
            </span>
          </div>
        </div>
      </div>

      {/* 右侧聊天区 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <div className="h-16 px-6 border-b border-indigo-500/10 flex items-center justify-between bg-[#0f1629]/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {selectedAgent ? (
              <>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  (selectedAgent.status === 'online' || selectedAgent.isConnected)
                    ? 'bg-emerald-500/20'
                    : 'bg-red-500/20'
                }`}>
                  {TYPE_LABELS[selectedAgent.type] || '🤖'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-200">{selectedAgent.name}</div>
                  <div className="text-xs text-gray-500">
                    {(selectedAgent.status === 'online' || selectedAgent.isConnected) ? '🟢 在线' : '🔴 离线'}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">请选择一个 Agent 开始对话</div>
            )}
          </div>
          {filteredMessages.length > 0 && (
            <div className="text-xs text-gray-500">
              {filteredMessages.length} 条消息
            </div>
          )}
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!selectedAgent ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <div className="text-5xl mb-4 opacity-30">💬</div>
              <div className="text-sm">选择一个 Agent 开始通信</div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <div className="text-4xl mb-3 opacity-30">✨</div>
              <div className="text-sm">暂无消息，开始对话吧</div>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isMe = msg.senderId === 'me' || msg.senderId === selectedAgentId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                    {/* 发件人信息 */}
                    {!isMe && (
                      <div className="text-xs text-gray-500 mb-1 px-1">
                        {msg.sender?.name || msg.senderId}
                      </div>
                    )}
                    {/* 消息气泡 */}
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md shadow-lg shadow-indigo-500/20'
                        : 'bg-[#1e293b] text-gray-200 rounded-bl-md border border-indigo-500/10'
                    }`}>
                      {msg.content}
                    </div>
                    {/* 时间戳 */}
                    <div className={`text-xs text-gray-600 mt-1 px-1 ${isMe ? 'text-right' : ''}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="p-4 border-t border-indigo-500/10 bg-[#0f1629]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={selectedAgent ? '输入消息... (Enter 发送)' : '请先选择 Agent'}
              disabled={!selectedAgent || sending}
              className="flex-1 px-5 py-3 bg-[#1e293b] border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!selectedAgent || !inputText.trim() || sending}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition disabled:opacity-30 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
            >
              {sending ? '⏳' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
