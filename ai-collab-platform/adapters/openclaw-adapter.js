#!/usr/bin/env node
/**
 * OpenClaw Agent Adapter
 * 将 OpenClaw Agent 接入 AI Collab Platform
 * 
 * 用法: node adapters/openclaw-adapter.js [--agent-id <id>] [--agent-name <name>]
 */

const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const PORT = process.env.ADAPTER_PORT || 3002;
const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3001';

let agentId = process.argv.includes('--agent-id')
  ? process.argv[process.argv.indexOf('--agent-id') + 1]
  : null;

let agentName = process.argv.includes('--agent-name')
  ? process.argv[process.argv.indexOf('--agent-name') + 1]
  : 'OpenClaw-Agent';

const socket = io(`${PLATFORM_URL}/ws`, {
  transports: ['websocket'],
});

// 注册 Agent
socket.on('connect', async () => {
  console.log(`🔌 Connected to platform`);
  
  if (!agentId) {
    const res = await fetch(`${PLATFORM_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: agentName, type: 'openclaw' }),
    });
    const data = await res.json();
    agentId = data.id;
    console.log(`✅ Registered Agent: ${agentName} (ID: ${agentId})`);
  } else {
    console.log(`🤖 Using existing Agent ID: ${agentId}`);
  }
  
  socket.emit('agent:register', { name: agentName, type: 'openclaw' });
});

// 接收消息
socket.on('message:receive', (msg) => {
  console.log(`📨 [${agentName}] Received: ${msg.content.substring(0, 100)}...`);
  
  // 模拟 AI 回复（实际应调用 OpenClaw API）
  setTimeout(() => {
    const reply = `🤖 ${agentName} 回复: 我收到了你的消息 "${msg.content.substring(0, 50)}"`;
    socket.emit('message:send', {
      to: msg.senderId,
      content: reply,
      msgType: 'response',
      taskId: msg.taskId,
    });
    console.log(`📤 [${agentName}] Sent reply`);
  }, 1000);
});

// 连接状态
socket.on('disconnect', () => console.log('❌ Disconnected from platform'));
socket.on('connect_error', (err) => console.error('❌ Connection error:', err.message));

// HTTP API 端点（供 OpenClaw 回调）
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    try {
      const data = JSON.parse(body);
      
      // 发送消息到平台
      socket.emit('message:send', {
        to: data.to || '*',
        content: data.content || data.message || 'Hello from OpenClaw!',
        msgType: 'text',
        taskId: data.taskId,
      });
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', agentId, connected: socket.connected }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 OpenClaw Adapter running on http://localhost:${PORT}`);
  console.log(`📡 Platform URL: ${PLATFORM_URL}`);
  console.log(`🤖 Agent: ${agentName} (${agentId || 'not registered'})`);
});
