#!/usr/bin/env node
/**
 * Remote Agent Adapter (通用版)
 * 用于在其他机器上运行的 OpenClaw/Hermes Agent 接入 AI Collab Platform
 * 
 * 支持两种模式：
 *   1. WebSocket 直连 — 低延迟，适合局域网
 *   2. HTTP REST 中继 — 适合跨网络/公网
 * 
 * 用法:
 *   node remote-agent-adapter.js \
 *     --platform-url https://platform.example.com \
 *     --agent-id <uuid> \
 *     --api-key <your-secret-key> \
 *     --agent-name "MyOpenClaw" \
 *     --agent-type openclaw \
 *     --mode websocket   # 或 http
 * 
 * 环境变量:
 *   PLATFORM_URL, AGENT_ID, API_KEY, AGENT_NAME, AGENT_TYPE, ADAPTER_MODE
 */

const http = require('http');
const { io } = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');

// ==================== 配置解析 ====================
function parseArgs(args) {
  const config = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        config[key] = next;
        i++;
      } else {
        config[key] = true;
      }
    }
  }
  return config;
}

const args = parseArgs(process.argv.slice(2));

const PLATFORM_URL = args['platform-url'] || args.platform_url || process.env.PLATFORM_URL || 'http://localhost:3699';
const AGENT_ID = args['agent-id'] || args.agent_id || process.env.AGENT_ID || '';
const API_KEY = args['api-key'] || args.api_key || process.env.API_KEY || '';
const AGENT_NAME = args['agent-name'] || args.agent_name || process.env.AGENT_NAME || 'Remote-Agent';
const AGENT_TYPE = args['agent-type'] || args.agent_type || process.env.AGENT_TYPE || 'custom';
const ADAPTER_MODE = args.mode || process.env.ADAPTER_MODE || 'websocket'; // websocket | http
const HEARTBEAT_INTERVAL = parseInt(args.heartbeat_interval || process.env.HEARTBEAT_INTERVAL || '30000');
const WEBHOOK_PORT = parseInt(args.webhook_port || process.env.WEBHOOK_PORT || '0'); // 0 = 不启动

// ==================== 工具函数 ====================
function getBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function log(tag, msg) {
  console.log(`[${new Date().toISOString()}] ${tag} ${msg}`);
}

// ==================== 状态 ====================
let socket = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let isConnected = false;

// ==================== WebSocket 模式 ====================
function connectWebSocket() {
  const baseUrl = getBaseUrl(PLATFORM_URL);
  const wsUrl = baseUrl.replace('http', 'ws');
  
  log('WS', `Connecting to ${wsUrl}/ws ...`);
  
  socket = io(wsUrl + '/ws', {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionAttempts: 10,
    auth: {
      agentId: AGENT_ID,
      apiKey: API_KEY,
    },
  });

  socket.on('connect', () => {
    isConnected = true;
    log('WS', `✅ Connected! Agent: ${AGENT_NAME} (${AGENT_ID})`);
    
    // 注册 Agent
    socket.emit('agent:register', {
      name: AGENT_NAME,
      type: AGENT_TYPE,
      config: { remote: true, mode: 'websocket' },
    });
    
    // 启动心跳
    startHeartbeat();
  });

  socket.on('disconnect', () => {
    isConnected = false;
    log('WS', '❌ Disconnected');
    stopHeartbeat();
  });

  socket.on('connect_error', (err) => {
    log('WS', `❌ Connection error: ${err.message}`);
  });

  socket.on('message:receive', (msg) => {
    log('MSG', `📨 Received: ${msg.content?.substring(0, 100) || '(empty)'}`);
    handleIncomingMessage(msg);
  });

  socket.on('agent:status', (data) => {
    log('STATUS', `Agent ${data.agentId} status: ${data.status}`);
  });

  socket.on('agent:joined', (data) => {
    log('JOIN', `New agent joined: ${data.name} (${data.type})`);
  });
}

// ==================== HTTP 模式 ====================
let httpClient = null;

function startHttpClient() {
  const baseUrl = getBaseUrl(PLATFORM_URL);
  
  log('HTTP', `Starting HTTP client mode...`);
  log('HTTP', `Platform: ${baseUrl}`);
  log('HTTP', `Agent: ${AGENT_NAME} (${AGENT_ID})`);
  
  // 注册连接
  registerConnection();
  
  // 启动心跳
  startHeartbeat();
  
  // 启动轮询（每 5 秒检查新消息）
  startMessagePolling();
  
  // 启动本地 Webhook 服务器
  if (WEBHOOK_PORT > 0) {
    startWebhookServer();
  }
}

async function registerConnection() {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/remote/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-ID': AGENT_ID,
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ mode: 'http' }),
    });
    
    if (res.ok) {
      isConnected = true;
      log('HTTP', '✅ Registered connection');
    } else {
      const err = await res.text();
      log('HTTP', `❌ Registration failed: ${err}`);
      scheduleReconnect();
    }
  } catch (err) {
    log('HTTP', `❌ Network error: ${err.message}`);
    scheduleReconnect();
  }
}

async function sendHeartbeatHttp() {
  try {
    await fetch(`${PLATFORM_URL}/api/remote/connect/${AGENT_ID}/heartbeat`, {
      method: 'POST',
      headers: {
        'X-Agent-ID': AGENT_ID,
        'X-API-Key': API_KEY,
      },
    });
  } catch (err) {
    log('HTTP', `Heartbeat failed: ${err.message}`);
  }
}

async function sendMessage(to, content, msgType = 'text', taskId) {
  try {
    const res = await fetch(`${PLATFORM_URL}/api/remote/relay/${AGENT_ID}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-ID': AGENT_ID,
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ to, content, msgType, taskId }),
    });
    
    if (res.ok) {
      log('HTTP', `📤 Message sent to ${to}`);
    } else {
      log('HTTP', `❌ Failed to send: ${res.status}`);
    }
  } catch (err) {
    log('HTTP', `❌ Send error: ${err.message}`);
  }
}

async function pollMessages() {
  // HTTP 模式下，平台会通过 push 通知，或者我们轮询
  // 这里预留接口
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    log('HTTP', '🔄 Reconnecting in 10s...');
    registerConnection();
  }, 10000);
}

// ==================== 心跳 ====================
function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(async () => {
    if (ADAPTER_MODE === 'websocket' && socket && socket.connected) {
      socket.emit('ping');
    } else if (ADAPTER_MODE === 'http') {
      await sendHeartbeatHttp();
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ==================== 消息处理 ====================
function handleIncomingMessage(msg) {
  // 子类可以覆盖这个方法
  log('HANDLER', `Message handler called for: ${msg.content?.substring(0, 50)}`);
  
  // 默认：自动回复
  setTimeout(() => {
    const reply = `🤖 ${AGENT_NAME}: Acknowledged "${msg.content?.substring(0, 50)}"`;
    if (ADAPTER_MODE === 'websocket' && socket) {
      socket.emit('message:send', {
        to: msg.senderId,
        content: reply,
        msgType: 'response',
        taskId: msg.taskId,
      });
    } else if (ADAPTER_MODE === 'http') {
      sendMessage(msg.senderId, reply, 'response', msg.taskId);
    }
  }, 1000);
}

// ==================== Webhook 服务器 ====================
function startWebhookServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'POST' && req.url === '/webhook') {
      let body = '';
      req.on('data', chunk => body += chunk);
      
      try {
        const data = JSON.parse(body);
        
        if (ADAPTER_MODE === 'websocket' && socket) {
          socket.emit('message:send', {
            to: data.to || '*',
            content: data.content || data.message || 'Hello!',
            msgType: data.msgType || 'text',
            taskId: data.taskId,
          });
        } else if (ADAPTER_MODE === 'http') {
          sendMessage(data.to || '*', data.content || data.message || 'Hello!', data.msgType, data.taskId);
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
        agentId: AGENT_ID,
        agentName: AGENT_NAME,
        connected: isConnected,
        mode: ADAPTER_MODE,
        timestamp: new Date().toISOString(),
      }));
    } else if (req.method === 'POST' && req.url === '/send') {
      let body = '';
      req.on('data', chunk => body += chunk);
      
      try {
        const data = JSON.parse(body);
        
        if (ADAPTER_MODE === 'websocket' && socket) {
          socket.emit('message:send', {
            to: data.to || '*',
            content: data.content,
            msgType: data.msgType || 'text',
            taskId: data.taskId,
          });
        } else if (ADAPTER_MODE === 'http') {
          sendMessage(data.to || '*', data.content, data.msgType, data.taskId);
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(WEBHOOK_PORT, '0.0.0.0', () => {
    log('WEBHOOK', `Webhook server listening on port ${WEBHOOK_PORT}`);
  });
}

// ==================== 启动 ====================
log('CONFIG', `Mode: ${ADAPTER_MODE}, Agent: ${AGENT_NAME}, Type: ${AGENT_TYPE}`);

if (ADAPTER_MODE === 'websocket') {
  connectWebSocket();
} else {
  startHttpClient();
}

// 优雅退出
process.on('SIGINT', () => {
  log('EXIT', 'Shutting down...');
  stopHeartbeat();
  if (socket) socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('EXIT', 'Shutting down...');
  stopHeartbeat();
  if (socket) socket.disconnect();
  process.exit(0);
});

// 暴露给外部调用的接口
module.exports = {
  sendMessage,
  handleIncomingMessage,
  get isConnected() { return isConnected; },
  get agentId() { return AGENT_ID; },
  get agentName() { return AGENT_NAME; },
};
