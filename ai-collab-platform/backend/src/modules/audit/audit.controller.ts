import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}
  
  @Get('task/:taskId')
  @ApiOperation({ summary: '获取任务审计日志' })
  findByTask(@Param('taskId') taskId: string) {
    return this.auditService.findByTask(taskId);
  }
  
  @Get('agent/:agentId')
  @ApiOperation({ summary: '获取 Agent 审计日志' })
  findByAgent(@Param('agentId') agentId: string) {
    return this.auditService.findByAgent(agentId);
  }
}
