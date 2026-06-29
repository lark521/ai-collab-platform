import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}
  
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
