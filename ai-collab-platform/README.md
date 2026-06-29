# AI Collab Platform - 多AI Agent协作沟通平台

一个支持多个AI Agent（OpenClaw、Hermes等）互相交流沟通的平台，具备可视化通信、任务管理、过程溯源和Docker部署能力。

## 功能特性

- 🔗 **多Agent通信** - 支持OpenClaw、Hermes等多种Agent接入
- 🌐 **远程 Agent 连接** - 支持跨机器/跨网络的 Agent 接入（WebSocket 直连 + HTTP REST 中继）
- 🔑 **API Key 认证** - 每个 Agent 拥有独立 API Key，安全可靠
- 💓 **心跳检测** - 自动检测远程 Agent 在线状态，超时自动下线
- 📊 **实时通信可视化** - WebSocket驱动的实时消息流图 + ECharts拓扑
- 📋 **任务管理系统** - 任务创建/分配/角色管理/过程追踪
- 🔍 **过程溯源** - 完整的操作审计日志
- 📝 **结果报告** - 自动生成任务完成报告（支持JSON/TXT导出）
- 🧪 **测试验证** - 任务测试结果记录和通过率统计
- 🐳 **Docker部署** - 一键启动，跨平台移植

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Dashboard (React + ECharts)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ 实时通信  │  │ 任务管理  │  │ 可视化面板 │  │ 结果报告   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket / REST API
┌──────────────────────────▼──────────────────────────────────┐
│                  Platform Backend (NestJS)                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ WebSocket  │ │ 任务调度器  │ │ 消息路由    │               │
│  │ 网关       │ │            │ │            │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│  ┌────────────┐ ┌────────────┐                               │
│  │ PostgreSQL │ │    Redis   │                               │
│  └────────────┘ └────────────┘                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ Socket.IO 适配器
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ OpenClaw │      │ Hermes   │      │ 自定义    │
  │ Adapter  │      │ Adapter  │      │ Adapter  │
  └──────────┘      └──────────┘      └──────────┘
```

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 一键启动所有服务
docker compose up -d

# 访问 Web 界面
open http://localhost:3000

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 方式二：本地开发

```bash
# 1. 启动基础设施
docker compose up -d db redis

# 2. 配置后端环境变量
cp backend/.env.example backend/.env

# 3. 安装并启动后端
cd backend
npm install
npx prisma migrate dev
npm run start:dev

# 4. 安装并启动前端
cd ../frontend
npm install
npm run dev

# 5. 启动 Agent 适配器（可选）
cd ../adapters
npm install
node openclaw-adapter.js --agent-name "MyOpenClaw"
node hermes-adapter.js --agent-name "MyHermes"
```

## 远程 Agent 连接

平台支持远程机器上的 OpenClaw/Hermes Agent 通过 API Key 认证后接入。

### 使用步骤

**1. 在平台添加 Agent**
- 进入「Agent 管理」标签页
- 添加新 Agent，记录 Agent ID
- 点击 🔄 生成 API Key（只显示一次，请妥善保存）

**2. 在远程机器上运行适配器**

```bash
# 安装依赖
cd adapters
npm install

# WebSocket 模式（推荐，低延迟）
node remote-agent-adapter.js \\
  --platform-url http://YOUR_PLATFORM_IP:3699 \\
  --agent-id <AGENT_ID> \\
  --api-key <API_KEY> \\
  --agent-name "MyOpenClaw" \\
  --agent-type openclaw \\
  --mode websocket

# HTTP 模式（适合跨网络/公网）
node remote-agent-adapter.js \\
  --platform-url https://platform.example.com \\
  --agent-id <AGENT_ID> \\
  --api-key <API_KEY> \\
  --agent-name "MyHermes" \\
  --agent-type hermes \\
  --mode http \\
  --webhook-port 3002
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `PLATFORM_URL` | 平台地址 | `http://192.168.1.100:3699` |
| `AGENT_ID` | Agent UUID | `a1b2c3d4-...` |
| `API_KEY` | 认证密钥 | `32位hex字符串` |
| `AGENT_NAME` | Agent 名称 | `MyOpenClaw` |
| `AGENT_TYPE` | Agent 类型 | `openclaw` / `hermes` / `custom` |
| `ADAPTER_MODE` | 连接模式 | `websocket` / `http` |
| `HEARTBEAT_INTERVAL` | 心跳间隔(ms) | `30000` |
| `WEBHOOK_PORT` | Webhook 端口 | `3002` |

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/remote/connect` | 注册远程连接 |
| POST | `/api/remote/connect/:id/heartbeat` | 心跳 |
| POST | `/api/remote/relay/:id/message` | 发送消息 |
| GET | `/api/remote/status` | 连接状态概览 |
| GET | `/api/remote/health/:id?key=` | 健康检查 |

### 安全说明

- API Key 以 SHA-256 哈希形式存储在数据库中
- 每次连接都需要验证 API Key
- 支持随时重新生成 API Key（旧 Key 立即失效）
- 90 秒无心跳自动标记为离线

---

## 模块说明

### 后端 (backend/)
- **NestJS** 框架，TypeScript 编写
- **Prisma** ORM，PostgreSQL 数据库
- **Socket.IO** 实时通信
- 4个核心模块：Agents / Tasks / Messages / Audit

### 前端 (frontend/)
- **React 18** + **Vite** + **TailwindCSS**
- **ECharts** 通信拓扑可视化
- **Socket.IO Client** 实时消息
- 4个页面：通信 / 任务管理 / 可视化 / 报告

### 适配器 (adapters/)
- **openclaw-adapter.js** - 本地 OpenClaw Agent 接入（WebSocket）
- **hermes-adapter.js** - 本地 Hermes Agent 接入（WebSocket）
- **remote-agent-adapter.js** - 通用远程 Agent 接入（WebSocket + HTTP 双模式）
- 每个适配器提供 `/webhook`、`/send` 和 `/health` 端点

## API 文档

启动后端后访问：`http://localhost:3001/api/docs` (Swagger)

### 主要 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/agents` | 注册新 Agent |
| GET | `/api/agents` | 获取所有 Agent |
| GET | `/api/agents/online` | 获取在线 Agent |
| POST | `/api/tasks` | 创建任务 |
| GET | `/api/tasks` | 获取任务列表 |
| GET | `/api/tasks/:id` | 获取任务详情 |
| POST | `/api/tasks/roles` | 分配 Agent 角色 |
| GET | `/api/tasks/:id/report` | 生成任务报告 |
| POST | `/api/tasks/tests` | 添加测试结果 |
| GET | `/api/messages` | 获取所有消息 |
| GET | `/api/messages/task/:id` | 获取任务消息 |
| GET | `/api/audit/task/:id` | 获取任务审计日志 |
| GET | `/api/remote/agents` | 获取远程 Agent 列表 |
| POST | `/api/remote/connect` | 远程 Agent 注册连接 |
| POST | `/api/remote/connect/:id/heartbeat` | 心跳 |
| POST | `/api/remote/relay/:id/message` | 消息中继 |
| GET | `/api/remote/status` | 连接状态概览 |

### WebSocket 事件

| 方向 | 事件 | 说明 |
|------|------|------|
| Client→Server | `agent:register` | 注册 Agent |
| Client→Server | `message:send` | 发送消息 |
| Client→Server | `room:join` | 加入房间 |
| Client→Server | `room:leave` | 离开房间 |
| Client→Server | `ping` | 心跳 |
| Server→Client | `message:new` | 新消息广播 |
| Server→Client | `message:receive` | 收到消息 |
| Server→Client | `agent:status` | Agent 状态变更 |
| Server→Client | `agent:joined` | 新 Agent 加入 |

## 数据库模型

- **Agent** - Agent 注册信息（名称、类型、状态）
- **Task** - 任务（标题、描述、状态、优先级）
- **TaskRole** - 任务角色分配（Agent ↔ 角色映射）
- **Message** - 消息（发送者、接收者、内容、类型）
- **AuditLog** - 审计日志（操作、详情、时间线）
- **TestResult** - 测试结果（用例、通过/失败）

## Docker 部署

### 最小部署（仅平台）
```bash
docker compose up -d
```

### 完整部署（含适配器）
```bash
docker compose --profile adapters up -d
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| DATABASE_URL | postgresql://postgres:postgres@db:5432/aicollab | 数据库连接 |
| REDIS_HOST | redis | Redis 主机 |
| PORT | 3001 | 后端端口 |
| FRONTEND_URL | http://localhost:3000 | 前端地址 |

## 目录结构

```
ai-collab-platform/
├── backend/                  # NestJS 后端
│   ├── src/
│   │   ├── modules/
│   │   │   ├── agents/              # Agent 模块
│   │   │   ├── tasks/               # 任务模块
│   │   │   ├── messages/            # 消息模块
│   │   │   ├── audit/               # 审计模块
│   │   │   └── remote-connection/   # 远程连接模块
│   │   ├── prisma/
│   │   │   └── schema.prisma # 数据库模型
│   │   ├── ws.gateway.ts     # WebSocket 网关
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   └── package.json
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/         # 通信界面
│   │   │   ├── tasks/        # 任务管理
│   │   │   ├── visualization/# 可视化面板
│   │   │   └── dashboard/    # 主仪表板
│   │   ├── hooks/            # React Hooks
│   │   ├── services/         # API 服务
│   │   └── App.tsx
│   └── package.json
├── adapters/                 # Agent 适配器
│   ├── openclaw-adapter.js       # 本地 OpenClaw 适配器
│   ├── hermes-adapter.js         # 本地 Hermes 适配器
│   └── remote-agent-adapter.js   # 通用远程适配器（WebSocket + HTTP）
├── docker-compose.yml        # Docker 编排
├── Dockerfile                # 多阶段构建
├── nginx.conf                # Nginx 配置
├── docker-entrypoint.sh      # 启动脚本
└── README.md
```

## 许可证

MIT
