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
    const status = params.status;
    const page = Number(params.page) || 1;
    const size = Number(params.size) || 20;
    const where: any = {};
    if (status) where.status = status;
    
    const tasks = await this.prisma.task.findMany({
      where,
      skip: (page - 1) * size,
      take: size,
      orderBy: { createdAt: 'desc' },
    });
    
    const total = await this.prisma.task.count({ where });
    
    // 手动加载 taskRoles
    const tasksWithRoles = await Promise.all(
      tasks.map(async (task) => {
        const taskRoles = await this.prisma.taskRole.findMany({
          where: { taskId: task.id },
          include: { agent: true },
        });
        return { ...task, taskRoles };
      })
    );
    
    return { tasks: tasksWithRoles, total, page, size };
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
    // 查找匹配的活跃角色
    let roleId: string | undefined;
    if (data.roleName) {
      const role = await this.prisma.role.findFirst({
        where: { name: data.roleName, isActive: true },
        select: { id: true },
      });
      roleId = role?.id;
    }
    
    try {
      return this.prisma.taskRole.create({
        data: {
          taskId: data.taskId,
          agentId: data.agentId,
          roleName: data.roleName,
          roleId: roleId || null,
        },
        include: { agent: true },
      });
    } catch (err: any) {
      // 处理唯一约束冲突（同一 agent 已在该任务中）
      if (err.code === 'P2002') {
        return this.prisma.taskRole.findFirst({
          where: { taskId: data.taskId, agentId: data.agentId },
          include: { agent: true },
        });
      }
      throw err;
    }
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
      if (msg.senderId) {
        if (!agentStats[msg.senderId]) {
          agentStats[msg.senderId] = { count: 0, name: '' };
        }
        agentStats[msg.senderId].count++;
      }
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
        ? (() => {
            const seconds = Math.floor((task.completedAt.getTime() - task.createdAt.getTime()) / 1000);
            if (seconds < 60) return `${seconds}s`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
          })()
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
