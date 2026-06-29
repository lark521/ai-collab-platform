import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}
  
  @Get('task/:taskId')
  @ApiOperation({ summary: '获取任务消息' })
  findByTask(@Param('taskId') taskId: string, @Query('limit') limit = 100) {
    return this.messagesService.findByTask(taskId, Number(limit));
  }
  
  @Get('agent/:agentId')
  @ApiOperation({ summary: '获取 Agent 消息' })
  findByAgent(@Param('agentId') agentId: string, @Query('limit') limit = 100) {
    return this.messagesService.findByAgent(agentId, Number(limit));
  }
  
  @Get()
  @ApiOperation({ summary: '获取所有消息' })
  getAll(@Query('limit') limit = 200) {
    return this.messagesService.getAll(Number(limit));
  }
}
