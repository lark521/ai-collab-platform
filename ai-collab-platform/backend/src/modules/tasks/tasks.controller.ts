import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, AssignRoleDto } from './dto/create-task.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';

@ApiTags('tasks')
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}
  
  @Post()
  @ApiOperation({ summary: '创建任务' })
  create(@Body() data: CreateTaskDto) {
    return this.tasksService.create(data);
  }
  
  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  findAll(@Query('status') status?: string, @Query('page') page?: number, @Query('size') size?: number) {
    return this.tasksService.findAll({ status, page, size });
  }
  
  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }
  
  @Put(':id/status')
  @ApiOperation({ summary: '更新任务状态' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tasksService.updateStatus(id, status);
  }
  
  @Post('roles')
  @ApiOperation({ summary: '分配 Agent 角色' })
  assignRole(@Body() data: AssignRoleDto) {
    return this.tasksService.assignRole(data);
  }
  
  @Delete(':taskId/roles/:agentId')
  @ApiOperation({ summary: '移除角色分配' })
  removeRole(@Param('taskId') taskId: string, @Param('agentId') agentId: string) {
    return this.tasksService.removeRole(taskId, agentId);
  }
  
  @Get(':taskId/roles')
  @ApiOperation({ summary: '获取任务角色列表' })
  getTaskRoles(@Param('taskId') taskId: string) {
    return this.tasksService.getTaskRoles(taskId);
  }
  
  @Post('tests')
  @ApiOperation({ summary: '添加测试结果' })
  addTestResult(@Body() data: CreateTestResultDto) {
    return this.tasksService.addTestResult(data);
  }
  
  @Get(':taskId/report')
  @ApiOperation({ summary: '生成任务完成报告' })
  generateReport(@Param('taskId') taskId: string) {
    return this.tasksService.generateReport(taskId);
  }
  
  @Get(':taskId/test-report')
  @ApiOperation({ summary: '获取测试报告' })
  getTestReport(@Param('taskId') taskId: string) {
    return this.tasksService.getTestReport(taskId);
  }
}
