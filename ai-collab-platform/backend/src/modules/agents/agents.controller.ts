import { Controller, Get, Post, Put, Delete, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@ApiTags('agents')
@Controller('api/agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly prisma: PrismaService,
  ) {}
  
  @Post()
  @ApiOperation({ summary: '注册新 Agent' })
  create(@Body() data: CreateAgentDto) {
    return this.agentsService.create(data);
  }
  
  @Get()
  @ApiOperation({ summary: '获取所有 Agent' })
  findAll() {
    return this.agentsService.findAll();
  }
  
  @Get('online')
  @ApiOperation({ summary: '获取在线 Agent' })
  getOnline() {
    return this.agentsService.getOnlineAgents();
  }
  
  @Get(':id')
  @ApiOperation({ summary: '获取单个 Agent 详情' })
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }
  
  @Put(':id')
  @ApiOperation({ summary: '更新 Agent' })
  update(@Param('id') id: string, @Body() data: UpdateAgentDto) {
    return this.agentsService.update(id, data);
  }
  
  @Delete(':id')
  @ApiOperation({ summary: '删除 Agent' })
  remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }

  @Post(':id/regenerate-key')
  @ApiOperation({ summary: '重新生成 Agent API Key' })
  @ApiResponse({ status: 200, description: '成功生成新的 API Key' })
  async regenerateApiKey(@Param('id') id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    // 生成新的 API Key
    const rawKey = crypto.randomBytes(32).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    // 存储哈希到数据库
    await this.prisma.agent.update({
      where: { id },
      data: { apiKey: hashedKey },
    });

    Logger.log(`API Key regenerated for agent: ${agent.name} (${id})`);

    return {
      agentId: id,
      agentName: agent.name,
      apiKey: rawKey,
      warning: '请妥善保存此 Key，后续不再显示',
    };
  }
}
