import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Headers, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { RemoteConnectionService } from './remote-connection.service';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

/**
 * 远程连接守卫 — 验证 API Key
 */
class RemoteAuthGuard {
  constructor(private service: RemoteConnectionService, private prisma: PrismaService) {}

  async canActivate(req: any, headers: any): Promise<boolean> {
    const agentId = headers['x-agent-id'] || headers['agent-id'];
    const apiKey = headers['x-api-key'] || headers['api-key'];

    if (!agentId || !apiKey) return false;

    return this.service.validateApiKey(agentId, apiKey);
  }
}

@ApiTags('remote')
@Controller('api/remote')
export class RemoteConnectionController {
  constructor(
    private readonly remoteService: RemoteConnectionService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== Agent 管理 ====================

  @Get('agents')
  @ApiOperation({ summary: '获取所有支持远程连接的 Agent' })
  async listRemoteCapableAgents() {
    return this.prisma.agent.findMany({
      select: {
        id: true, name: true, type: true, status: true,
        remoteUrl: true, apiKey: true, isConnected: true, lastHeartbeat: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Put('agents/:id')
  @ApiOperation({ summary: '配置 Agent 的远程连接参数' })
  async updateAgentRemoteConfig(
    @Param('id') id: string,
    @Body() data: { remoteUrl?: string; type?: string; config?: any },
  ) {
    const updateData: any = {};
    if (data.remoteUrl !== undefined) updateData.remoteUrl = data.remoteUrl;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.config !== undefined) updateData.config = data.config;

    return this.prisma.agent.update({ where: { id }, data: updateData });
  }

  @Post('agents/:id/regenerate-key')
  @ApiOperation({ summary: '重新生成 Agent 的 API Key' })
  async regenerateApiKey(@Param('id') id: string) {
    const newKey = await this.remoteService.generateApiKey(id);
    const agent = await this.prisma.agent.findUnique({ where: { id }, select: { name: true } });
    return {
      agentId: id,
      agentName: agent?.name,
      apiKey: newKey,
      warning: '请妥善保存此 Key，后续不再显示',
    };
  }

  // ==================== 连接管理 ====================

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '远程 Agent 注册连接（WebSocket 或 HTTP 模式）' })
  @ApiHeader({ name: 'X-Agent-ID', description: 'Agent ID', example: 'uuid' })
  @ApiHeader({ name: 'X-API-Key', description: 'API 密钥', example: 'secret' })
  async registerConnection(
    @Headers('x-agent-id') agentId: string,
    @Headers('x-api-key') apiKey: string,
    @Body() data: { mode?: 'websocket' | 'http'; ip?: string },
  ) {
    // 验证 API Key
    const valid = await this.remoteService.validateApiKey(agentId, apiKey);
    if (!valid) {
      throw new Error('Invalid API key');
    }

    return this.remoteService.registerRemoteConnection(
      agentId,
      data.mode || 'websocket',
      data.ip,
    );
  }

  @Post('connect/:agentId/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '断开远程 Agent 连接' })
  async disconnect(
    @Param('agentId') agentId: string,
    @Body() data: { apiKey: string },
  ) {
    const valid = await this.remoteService.validateApiKey(agentId, data.apiKey);
    if (!valid) throw new Error('Invalid API key');
    return this.remoteService.disconnectAgent(agentId);
  }

  @Post('connect/:agentId/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '远程 Agent 心跳' })
  @ApiHeader({ name: 'X-Agent-ID', description: 'Agent ID' })
  @ApiHeader({ name: 'X-API-Key', description: 'API 密钥' })
  async sendHeartbeat(
    @Param('agentId') agentId: string,
    @Headers('x-api-key') apiKey: string,
  ) {
    const valid = await this.remoteService.validateApiKey(agentId, apiKey);
    if (!valid) throw new Error('Invalid API key');
    return this.remoteService.heartbeat(agentId);
  }

  // ==================== 消息中继 ====================

  @Post('relay/:agentId/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '远程 Agent 发送消息到平台' })
  @ApiHeader({ name: 'X-Agent-ID', description: 'Agent ID' })
  @ApiHeader({ name: 'X-API-Key', description: 'API 密钥' })
  async relayMessage(
    @Param('agentId') agentId: string,
    @Headers('x-api-key') apiKey: string,
    @Body() data: { to: string; content: string; msgType?: string; taskId?: string; metadata?: any },
  ) {
    const valid = await this.remoteService.validateApiKey(agentId, apiKey);
    if (!valid) throw new Error('Invalid API key');
    return this.remoteService.relayMessage(agentId, data);
  }

  // ==================== 状态查询 ====================

  @Get('status')
  @ApiOperation({ summary: '获取远程连接状态概览' })
  async getStatus() {
    return this.remoteService.getConnectionStatus();
  }

  // ==================== 公开的健康检查（带 API Key 验证）====================

  @Get('health/:agentId')
  @ApiOperation({ summary: '远程 Agent 健康检查' })
  async healthCheck(
    @Param('agentId') agentId: string,
    @Query('key') apiKey: string,
  ) {
    const valid = await this.remoteService.validateApiKey(agentId, apiKey);
    if (!valid) {
      return { status: 'unauthorized', agentId };
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, type: true, status: true, isConnected: true },
    });

    return {
      status: valid ? 'authorized' : 'unauthorized',
      agent,
      timestamp: new Date().toISOString(),
    };
  }
}
