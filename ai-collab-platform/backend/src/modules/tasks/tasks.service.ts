import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, AssignRoleDto } from './dto/create-task.dto';
import { CreateTestResultDto } from './dto/create-test-result.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}
  
  async create(data: CreateTaskDto, createdBy?: string) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || 'normal',
        deadline: data.deadline ? new Date(data.deadline) : null,
        createdBy,
      },
      include: {
        taskRoles: { include: { agent: true } },
      },
    });
  }
  
  async findAll(params: { status?: string; page?: number; size?: number }) {
    const { status, page = 1, size = 20 } = params;
    const where: any = {};
    if (status) where.status = status;
    
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: {
          taskRoles: { include: { agent: true } },
          _count: { select: { messages: true, auditLogs: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);
    
    return { tasks, total, page, size };
  }
  
  async findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        taskRoles: { include: { agent: true } },
        messages: { orderBy: { timestamp: 'asc' } },
        auditLogs: { orderBy: { timestamp: 'asc' } },
        testResults: { orderBy: { timestamp: 'desc' } },
      },
    });
  }
  
  async updateStatus(id: string, status: string) {
    return this.prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });
  }
  
  // 分配角色
  async assignRole(data: AssignRoleDto) {
    return this.prisma.taskRole.create({
      data: {
        taskId: data.taskId,
        agentId: data.agentId,
        roleName: data.roleName,
      },
      include: { agent: true },
    });
  }
  
  // 移除角色
  async removeRole(taskId: string, agentId: string) {
    return this.prisma.taskRole.delete({
      where: { taskId_agentId: { taskId, agentId } },
    });
  }
  
  // 获取任务的 Agent 角色列表
  async getTaskRoles(taskId: string) {
    return this.prisma.taskRole.findMany({
      where: { taskId },
      include: { agent: true },
      orderBy: { assignedAt: 'asc' },
    });
  }
  
  // 添加测试结果
  async addTestResult(data: CreateTestResultDto) {
    return this.prisma.testResult.create({
      data: {
        taskId: data.taskId,
        testCase: data.testCase,
        passed: data.passed,
        detail: data.detail,
      },
    });
  }
  
  // 获取任务测试报告
  async getTestReport(taskId: string) {
    const results = await this.prisma.testResult.findMany({
      where: { taskId },
      orderBy: { timestamp: 'desc' },
    });
    
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    
    return {
      taskId,
      total,
      passed,
      failed,
      passRate: total > 0 ? (passed / total * 100).toFixed(1) : '0',
      results,
    };
  }
  
  // 生成任务完成报告
  async generateReport(taskId: string) {
    const task = await this.findOne(taskId);
    if (!task) throw new Error('Task not found');
    
    // 统计各 Agent 的消息数量
    const agentStats: Record<string, any> = {};
    task.messages.forEach(msg => {
      if (!agentStats[msg.senderId]) {
        agentStats[msg.senderId] = { count: 0, name: '' };
      }
      agentStats[msg.senderId].count++;
    });
    
    // 各角色 Agent 的贡献
    const roleContributions = task.taskRoles.map(tr => ({
      agentId: tr.agent.id,
      agentName: tr.agent.name,
      roleName: tr.roleName,
      messageCount: agentStats[tr.agent.id]?.count || 0,
    }));
    
    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      duration: task.createdAt && task.completedAt 
        ? `${Math.floor((task.completedAt.getTime() - task.createdAt.getTime()) / 1000)}s` 
        : null,
      roles: roleContributions,
      totalMessages: task.messages.length,
      totalAuditLogs: task.auditLogs.length,
      testReport: task.testResults.length > 0 ? await this.getTestReport(taskId) : null,
      timeline: task.messages.map(m => ({
        time: m.timestamp,
        sender: m.senderId,
        type: m.msgType,
        preview: m.content.substring(0, 100),
      })),
    };
  }
}
