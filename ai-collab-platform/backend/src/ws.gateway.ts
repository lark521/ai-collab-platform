import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private logger = new Logger(WsGateway.name);
  
  constructor(private prisma: PrismaService) {}
  
  // 处理客户端连接
  async handleConnection(client: Socket) {
    const agentId = client.handshake.query.agentId as string;
    if (agentId) {
      this.logger.log(`Agent connected: ${agentId} (${client.id})`);
      client.data.agentId = agentId;
      
      // 更新 Agent 状态为 online
      await this.prisma.agent.updateMany({
        where: { id: agentId },
        data: { status: 'online' },
      });
      
      // 通知其他客户端有新 Agent 上线
      this.server.emit('agent:status', {
        agentId,
        status: 'online',
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // 处理客户端断开
  handleDisconnect(client: Socket) {
    const agentId = client.data?.agentId;
    if (agentId) {
      this.logger.log(`Agent disconnected: ${agentId}`);
      
      // 更新 Agent 状态为 offline
      this.prisma.agent.updateMany({
        where: { id: agentId },
        data: { status: 'offline' },
      }).catch(() => {});
      
      this.server.emit('agent:status', {
        agentId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // 注册 Agent
  @SubscribeMessage('agent:register')
  async handleRegister(@MessageBody() data: { name: string; type: string; config?: any }): Promise<{ id: string }> {
    const agent = await this.prisma.agent.create({
      data: {
        id: uuidv4(),
        name: data.name,
        type: data.type,
        config: data.config,
        status: 'online',
      },
    });
    
    this.logger.log(`Agent registered: ${agent.name} (${agent.id})`);
    
    // 通知所有客户端新 Agent 加入
    this.server.emit('agent:joined', {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
    });
    
    return { id: agent.id };
  }
  
  // 发送消息（Agent -> Agent）
  @SubscribeMessage('message:send')
  async handleMessageSend(
    @MessageBody() data: {
      to: string;
      content: string;
      msgType?: string;
      taskId?: string;
      metadata?: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data?.agentId;
    if (!senderId) throw new Error('Agent not authenticated');
    
    // 保存消息到数据库
    const message = await this.prisma.message.create({
      data: {
        id: uuidv4(),
        senderId,
        receiverId: data.to,
        content: data.content,
        msgType: data.msgType || 'text',
        taskId: data.taskId || null,
        metadata: data.metadata || null,
      },
    });
    
    // 记录审计日志
    if (data.taskId) {
      this.prisma.auditLog.create({
        data: {
          id: uuidv4(),
          taskId: data.taskId,
          agentId: senderId,
          action: 'message',
          detail: `Sent message to ${data.to}`,
          metadata: { messageId: message.id },
        },
      }).catch(() => {});
    }
    
    // 如果是群发消息
    if (data.to === '*') {
      this.server.emit('message:new', message);
    } else {
      // 发送给特定 Agent 的房间
      const rooms = this.server.sockets.adapter.rooms;
      const roomMembers = rooms.get(data.to);
      if (roomMembers && roomMembers.size > 0) {
        this.server.to(data.to).emit('message:receive', message);
      } else {
        // 房间不存在（远程 Agent 无法 join），广播给所有客户端
        this.server.emit('message:new', message);
      }
    }
    
    return { success: true, messageId: message.id };
  }
  
  // 加入房间（任务）
  @SubscribeMessage('room:join')
  handleRoomJoin(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
    const agentId = client.data?.agentId;
    this.logger.log(`Agent ${agentId} joined room ${data.roomId}`);
    
    client.emit('room:joined', { roomId: data.roomId });
    this.server.to(data.roomId).emit('room:member', {
      agentId,
      action: 'joined',
      timestamp: new Date().toISOString(),
    });
  }
  
  // 离开房间
  @SubscribeMessage('room:leave')
  handleRoomLeave(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.leave(data.roomId);
    const agentId = client.data?.agentId;
    client.emit('room:left', { roomId: data.roomId });
    this.server.to(data.roomId).emit('room:member', {
      agentId,
      action: 'left',
      timestamp: new Date().toISOString(),
    });
  }
  
  // 心跳检测
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }
  
  // 获取 Agent 列表
  @SubscribeMessage('agents:list')
  async handleAgentsList() {
    const agents = await this.prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        updatedAt: true,
      },
    });
    return agents;
  }
}
