#!/usr/bin/env node
/**
 * Hermes Agent Adapter
 * 将 Hermes Agent 接入 AI Collab Platform
 * 
 * 用法: node adapters/hermes-adapter.js [--agent-id <id>] [--agent-name <name>]
 */

const { io } = require('socket.io-client');
const http = require('http');

const PORT = process.env.ADAPTER_PORT || 3003;
const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3001';

let agentId = process.argv.includes('--agent-id')
  ? process.argv[process.argv.indexOf('--agent-id') + 1]
  : null;

let agentName = process.argv.includes('--agent-name')
  ? process.argv[process.argv.indexOf('--agent-name') + 1]
  : 'Hermes-Agent';

const socket = io(`${PLATFORM_URL}/ws`, {
  transports: ['websocket'],
});

socket.on('connect', async () => {
  console.log(`🔌 Connected to platform`);
  
  if (!agentId) {
    const res = await fetch(`${PLATFORM_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: agentName, type: 'hermes' }),
    });
    const data = await res.json();
    agentId = data.id;
    console.log(`✅ Registered Agent: ${agentName} (ID: ${agentId})`);
  } else {
    console.log(`🤖 Using existing Agent ID: ${agentId}`);
  }
  
  socket.emit('agent:register', { name: agentName, type: 'hermes' });
});

socket.on('message:receive', (msg) => {
  console.log(`📨 [${agentName}] Received: ${msg.content.substring(0, 100)}...`);
  
  // 模拟 AI 回复（实际应调用 Hermes API）
  setTimeout(() => {
    const reply = `🦙 Hermes: 收到来自 ${msg.senderId} 的消息: "${msg.content.substring(0, 50)}"`;
    socket.emit('message:send', {
      to: msg.senderId,
      content: reply,
      msgType: 'response',
      taskId: msg.taskId,
    });
    console.log(`📤 [${agentName}] Sent reply`);
  }, 1500);
});

socket.on('disconnect', () => console.log('❌ Disconnected'));
socket.on('connect_error', (err) => console.error('❌ Error:', err.message));

// HTTP API 端点
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    try {
      const data = JSON.parse(body);
      socket.emit('message:send', {
        to: data.to || '*',
        content: data.content || data.message || 'Hello from Hermes!',
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
  console.log(`🚀 Hermes Adapter running on http://localhost:${PORT}`);
});
