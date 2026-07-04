#!/usr/bin/env node
/**
 * Hermes Agent Adapter
 * Bridges Hermes Agent ↔ AI Collab Platform
 * 
 * 环境变量:
 *   PLATFORM_URL  - 平台地址 (默认 http://localhost:3699)
 *   ADAPTER_PORT  - 本地 HTTP 端口 (默认 3003)
 *   AGENT_NAME    - Agent 名称 (默认 Hermes-Agent)
 */

const { io } = require('socket.io-client');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.ADAPTER_PORT || '3003');
const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3699';
const AGENT_NAME = process.env.AGENT_NAME || 'Hermes-Agent';
const AGENT_TYPE = 'hermes';
const LOG_PREFIX = 'Hermes';

const QUEUE_DIR = path.join(__dirname, 'queues');
const AGENT_PREFIX = AGENT_NAME.replace(/\s+/g, '-');
const REPLY_FILE = path.join(QUEUE_DIR, `${AGENT_PREFIX}-reply.json`);
const PENDING_FILE = path.join(QUEUE_DIR, `${AGENT_PREFIX}-pending.json`);
const CONSUME_LOCK = path.join(QUEUE_DIR, `${AGENT_PREFIX}-consume.lock`);

if (!fs.existsSync(QUEUE_DIR)) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

let platformAgentId = null;
let platformSocket = null;
let isConnected = false;

async function connectPlatform() {
  const wsUrl = PLATFORM_URL.replace(/^https?:/, 'ws:');
  
  try {
    const res = await fetch(`${PLATFORM_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: AGENT_NAME, type: AGENT_TYPE }),
    });
    
    if (res.ok) {
      const data = await res.json();
      platformAgentId = data.id;
      console.log(`[${LOG_PREFIX}] ✅ Registered Agent: ${AGENT_NAME} (ID: ${platformAgentId})`);
    } else {
      // 无论是 409 Conflict 还是 500 (duplicate name), 都尝试查找已有 Agent
      const errText = await res.text();
      console.log(`[${LOG_PREFIX}] ⚠️ Register returned ${res.status}, searching for existing agent...`);
      const agentsRes = await fetch(`${PLATFORM_URL}/api/agents`);
      const agents = await agentsRes.json();
      const existing = agents.find(a => a.name === AGENT_NAME);
      if (existing) {
        platformAgentId = existing.id;
        console.log(`[${LOG_PREFIX}] ✅ Found existing Agent: ${AGENT_NAME} (ID: ${platformAgentId})`);
      } else {
        console.error(`[${LOG_PREFIX}] ❌ Could not find existing agent. Response: ${errText}`);
        return;
      }
    }
  } catch (err) {
    console.error(`[${LOG_PREFIX}] ❌ Register error: ${err.message}`);
    return;
  }
  
  platformSocket = io(wsUrl + '/ws', {
    transports: ['websocket'],
    query: { agentId: platformAgentId },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 20,
  });

  platformSocket.on('connect', () => {
    console.log(`[${LOG_PREFIX}] 🔌 Connected to platform at ${PLATFORM_URL}`);
    isConnected = true;
    console.log(`[${LOG_PREFIX}] ✅ Connected and ready`);
  });

  platformSocket.on('message:receive', (msg) => {
    // 检查是否是发给本 Agent 的消息
    if (msg.receiverId !== platformAgentId) return;
    handleMessage(msg);
  });

  platformSocket.on('message:new', (msg) => {
    // 广播消息，检查是否是发给本 Agent 的
    if (msg.receiverId === platformAgentId) {
      handleMessage(msg);
    }
  });

  function handleMessage(msg) {
    const content = String(msg.content || '').substring(0, 500);
    console.log(`[${LOG_PREFIX}] 📨 Received: "${content}"`);
    
    const queueData = {
      messageId: msg.id || '',
      senderId: msg.senderId || '*',
      content: content,
      msgType: msg.msgType || 'text',
      taskId: msg.taskId || null,
      timestamp: new Date().toISOString(),
      agentName: AGENT_NAME,
    };
    
    try {
      fs.writeFileSync(PENDING_FILE, JSON.stringify(queueData));
      console.log(`[${LOG_PREFIX}] 📝 Message queued for ${AGENT_NAME}`);
    } catch (err) {
      console.error(`[${LOG_PREFIX}] ❌ Queue write error: ${err.message}`);
    }
  }

  // 定期检查新消息（作为 WebSocket 广播的备用方案）
  messageCheckInterval = setInterval(async () => {
    if (!isConnected) return;
    try {
      const res = await fetch(`${PLATFORM_URL}/api/messages/agent/${platformAgentId}?limit=1`);
      if (res.ok) {
        const messages = await res.json();
        if (messages.length > 0) {
          const latest = messages[0];
          const lastMsgFile = path.join(QUEUE_DIR, `${AGENT_PREFIX}-last-msg.txt`);
          let lastProcessed = '0';
          try { lastProcessed = fs.readFileSync(lastMsgFile, 'utf-8').trim(); } catch(e) {}
          if (latest.id !== lastProcessed) {
            fs.writeFileSync(lastMsgFile, latest.id);
            console.log(`[${LOG_PREFIX}] 📨 Poll detected new message: ${latest.content?.substring(0,50)}`);
            handleMessage(latest);
          }
        }
      }
    } catch (err) {
      console.error(`[${LOG_PREFIX}] Poll error: ${err.message}`);
    }
  }, 3000);

  platformSocket.on('disconnect', () => {
    console.log(`[${LOG_PREFIX}] ❌ Disconnected from platform`);
    isConnected = false;
  });

  platformSocket.on('connect_error', (err) => {
    console.error(`[${LOG_PREFIX}] ❌ Platform connection error: ${err.message}`);
  });

  platformSocket.on('agent:joined', (data) => {
    console.log(`[${LOG_PREFIX}] 👥 New agent: ${data.name} (${data.type})`);
  });
}

function checkReplyQueue() {
  if (!fs.existsSync(REPLY_FILE)) return;
  
  try {
    const lockExists = fs.existsSync(CONSUME_LOCK);
    if (lockExists) return;
    
    fs.writeFileSync(CONSUME_LOCK, Date.now().toString());
    
    const data = JSON.parse(fs.readFileSync(REPLY_FILE, 'utf-8'));
    
    if (data.reply && platformSocket && platformSocket.connected) {
      platformSocket.emit('message:send', {
        to: data.replyTo || data.senderId || '*',
        content: data.reply,
        msgType: data.msgType || 'response',
        taskId: data.taskId,
      });
      console.log(`[${LOG_PREFIX}] 📤 Reply sent to platform: "${String(data.reply).substring(0, 50)}"`);
    }
    
    fs.unlinkSync(REPLY_FILE);
    fs.unlinkSync(CONSUME_LOCK);
  } catch (err) {
    try { fs.unlinkSync(CONSUME_LOCK); } catch(e) {}
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    
    try {
      const data = JSON.parse(body);
      if (platformSocket && platformSocket.connected) {
        platformSocket.emit('message:send', {
          to: data.to || '*',
          content: data.content || data.message || 'Hello from Hermes!',
          msgType: data.msgType || 'text',
          taskId: data.taskId,
        });
      }
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      agentId: platformAgentId,
      agentName: AGENT_NAME,
      connected: isConnected,
      port: PORT,
      platformUrl: PLATFORM_URL,
      queueDir: QUEUE_DIR,
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

console.log(`[${LOG_PREFIX}] 🚀 Starting adapter...`);
console.log(`[${LOG_PREFIX}] 📡 Platform: ${PLATFORM_URL}`);
console.log(`[${LOG_PREFIX}] 🤖 Agent: ${AGENT_NAME}`);
console.log(`[${LOG_PREFIX}] 🔌 Local HTTP: http://localhost:${PORT}`);

const queueInterval = setInterval(checkReplyQueue, 2000);
let messageCheckInterval = null;

connectPlatform();

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[${LOG_PREFIX}] ✅ HTTP server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log(`[${LOG_PREFIX}] Shutting down...`);
  clearInterval(queueInterval);
  if (messageCheckInterval) clearInterval(messageCheckInterval);
  if (platformSocket) platformSocket.disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log(`[${LOG_PREFIX}] Shutting down...`);
  clearInterval(queueInterval);
  if (messageCheckInterval) clearInterval(messageCheckInterval);
  if (platformSocket) platformSocket.disconnect();
  server.close(() => process.exit(0));
});
