import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}
  
  async create(data: { senderId: string; receiverId: string; content: string; msgType?: string; taskId?: string }) {
    return this.prisma.message.create({
      data: {
        id: this.generateUuid(),
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        msgType: data.msgType || 'text',
        taskId: data.taskId || null,
      },
    });
  }
  
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  
  async findByTask(taskId: string, limit = 100) {
    return this.prisma.message.findMany({
      where: { taskId },
      orderBy: { timestamp: 'asc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, type: true } },
        receiver: { select: { id: true, name: true, type: true } },
      },
    });
  }
  
  async findByAgent(agentId: string, limit = 100) {
    return this.prisma.message.findMany({
      where: { OR: [{ senderId: agentId }, { receiverId: agentId }] },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, type: true } },
        receiver: { select: { id: true, name: true, type: true } },
      },
    });
  }
  
  async getAll(limit = 200) {
    return this.prisma.message.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, type: true } },
        receiver: { select: { id: true, name: true, type: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }
}
