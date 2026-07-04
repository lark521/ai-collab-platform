import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}
  
  async log(taskId: string, agentId: string, action: string, detail: string, metadata?: any) {
    return this.prisma.auditLog.create({
      data: {
        id: uuidv4(),
        taskId,
        agentId,
        action,
        detail,
        metadata,
      },
    });
  }
  
  async findByTask(taskId: string, limit = 200) {
    return this.prisma.auditLog.findMany({
      where: { taskId },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }
  
  async findByAgent(agentId: string, limit = 200) {
    return this.prisma.auditLog.findMany({
      where: { agentId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
