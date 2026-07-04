import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

/**
 * 远程 Agent 连接服务
 * 
 * 支持两种远程连接模式：
 * 1. WebSocket 直连 — 远程 Agent 通过 Socket.IO 连接到本平台
 * 2. HTTP API 中继 — 远程 Agent 通过 HTTP REST API 发送/接收消息
 * 
 * 适用于跨机器、跨网络的 OpenClaw/Hermes Agent 接入
 */
@Injectable()
export class RemoteConnectionService {
  private readonly logger = new Logger(RemoteConnectionService.name);
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30秒心跳
  private readonly HEARTBEAT_TIMEOUT_MS = 90000;   // 90秒超时

  // 内存中的活跃连接池（Agent ID -> 连接信息）
  private activeConnections = new Map<string, {
    connectedAt: Date;
    lastHeartbeat: Date;
    mode: 'websocket' | 'http';
    ip?: string;
  }>();

  constructor(private prisma: PrismaService) {
    // 启动心跳检查定时器
    setInterval(() => this.checkHeartbeats(), this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * 生成远程连接用的 API Key
   */
  async generateApiKey(agentId: string): Promise<string> {
    const key = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(key).digest('hex');

    // 存储哈希到数据库
    await this.prisma.agent.update({
      where: { id: agentId },
      data: { apiKey: hashed },
    });

    this.logger.log(`API Key generated for agent: ${agentId}`);
    return key;
  }

  /**
   * 验证 API Key（远程 Agent 认证）
   */
  async validateApiKey(agentId: string, providedKey: string): Promise<boolean> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { apiKey: true, name: true },
    });

    if (!agent || !agent.apiKey) return false;

    const hashed = crypto.createHash('sha256').update(providedKey).digest('hex');
    return hashed === agent.apiKey;
  }

  /**
   * 注册远程 Agent 连接（WebSocket 模式）
   */
  async registerRemoteConnection(
    agentId: string,
    mode: 'websocket' | 'http' = 'websocket',
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }

    if (!agent.apiKey) {
      throw new BadRequestException('Agent has no API key. Generate one first.');
    }

    // 记录活跃连接
    this.activeConnections.set(agentId, {
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      mode,
      ip,
    });

    // 更新数据库状态
    await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'online',
        isConnected: true,
        lastHeartbeat: new Date(),
      },
    });

    this.logger.log(`Remote agent ${agent.name} connected via ${mode} from ${ip || 'unknown'}`);

    return { success: true, message: `Connected via ${mode}` };
  }

  /**
   * 远程 Agent 发送心跳
   */
  async heartbeat(agentId: string): Promise<{ status: string; latency?: number }> {
    const conn = this.activeConnections.get(agentId);
    if (!conn) {
      throw new BadRequestException('No active connection. Re-register first.');
    }

    conn.lastHeartbeat = new Date();

    await this.prisma.agent.update({
      where: { id: agentId },
      data: { lastHeartbeat: new Date() },
    });

    const latency = Date.now() - conn.connectedAt.getTime();
    return { status: 'ok', latency };
  }

  /**
   * 远程 Agent 通过 HTTP 发送消息到平台
   */
  async relayMessage(
    agentId: string,
    data: {
      to: string;
      content: string;
      msgType?: string;
      taskId?: string;
      metadata?: any;
    },
  ): Promise<any> {
    const conn = this.activeConnections.get(agentId);
    if (!conn) {
      throw new BadRequestException('No active connection');
    }

    // 更新心跳
    conn.lastHeartbeat = new Date();

    // 保存消息到数据库
    const message = await this.prisma.message.create({
      data: {
        id: uuidv4(),
        senderId: agentId,
        receiverId: data.to === '*' ? null : data.to,
        content: data.content,
        msgType: data.msgType || 'text',
        taskId: data.taskId || null,
        metadata: data.metadata || null,
      },
    });

    return { success: true, messageId: message.id };
  }

  /**
   * 向远程 Agent 推送消息（通过 HTTP 回调）
   */
  async pushMessageToRemote(
    agentId: string,
    content: string,
    msgType?: string,
    taskId?: string,
  ): Promise<any> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || !agent.remoteUrl) {
      throw new NotFoundException(`Agent ${agentId} not configured for remote`);
    }

    // 尝试通过 HTTP 回调发送
    try {
      const response = await fetch(agent.remoteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Platform-Secret': agent.apiKey || '',
        },
        body: JSON.stringify({
          id: uuidv4(),
          content,
          msgType: msgType || 'text',
          taskId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return { success: true };
    } catch (err) {
      this.logger.error(`Failed to push to ${agentId}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * 检查所有远程 Agent 的心跳状态
   */
  private async checkHeartbeats(): Promise<void> {
    const now = new Date();
    const timedOut: string[] = [];

    for (const [agentId, conn] of this.activeConnections.entries()) {
      const elapsed = now.getTime() - conn.lastHeartbeat.getTime();
      if (elapsed > this.HEARTBEAT_TIMEOUT_MS) {
        timedOut.push(agentId);
      }
    }

    // 更新超时的 Agent 状态
    for (const agentId of timedOut) {
      this.activeConnections.delete(agentId);
      await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          status: 'offline',
          isConnected: false,
        },
      });
      this.logger.warn(`Remote agent ${agentId} timed out`);
    }
  }

  /**
   * 获取远程连接状态概览
   */
  async getConnectionStatus(): Promise<{
    totalAgents: number;
    onlineAgents: number;
    remoteConnected: number;
    connections: Array<{
      agentId: string;
      agentName: string;
      type: string;
      mode: string;
      connectedAt: string;
      lastHeartbeat: string;
      ip?: string;
    }>;
  }> {
    const agents = await this.prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        isConnected: true,
        lastHeartbeat: true,
      },
    });

    const onlineAgents = agents.filter(a => a.status === 'online').length;
    const remoteConnected = agents.filter(a => a.isConnected).length;

    const connections = agents
      .filter(a => a.isConnected)
      .map(a => {
        const conn = this.activeConnections.get(a.id);
        return {
          agentId: a.id,
          agentName: a.name,
          type: a.type,
          mode: conn?.mode || 'unknown',
          connectedAt: conn?.connectedAt.toISOString() || '',
          lastHeartbeat: a.lastHeartbeat?.toISOString() || '',
          ip: conn?.ip,
        };
      });

    return { totalAgents: agents.length, onlineAgents, remoteConnected, connections };
  }

  /**
   * 断开远程 Agent 连接
   */
  async disconnectAgent(agentId: string): Promise<{ success: boolean }> {
    this.activeConnections.delete(agentId);

    await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'offline',
        isConnected: false,
      },
    });

    this.logger.log(`Remote agent ${agentId} disconnected`);
    return { success: true };
  }
}
