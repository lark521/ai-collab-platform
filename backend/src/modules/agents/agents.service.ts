import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}
  
  async create(data: CreateAgentDto) {
    return this.prisma.agent.create({ data });
  }
  
  async findAll() {
    return this.prisma.agent.findMany({
      select: {
        id: true, name: true, type: true, status: true, updatedAt: true,
        remoteUrl: true, isConnected: true, lastHeartbeat: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
  
  async findOne(id: string) {
    return this.prisma.agent.findUnique({
      where: { id },
      select: {
        id: true, name: true, type: true, status: true, updatedAt: true,
        adapterType: true, config: true, remoteUrl: true, isConnected: true,
        lastHeartbeat: true, createdAt: true,
        taskRoles: { include: { agent: true } },
      },
    });
  }
  
  async update(id: string, data: UpdateAgentDto) {
    return this.prisma.agent.update({ where: { id }, data });
  }
  
  async remove(id: string) {
    await this.prisma.agent.delete({ where: { id } });
    return { success: true };
  }
  
  async getOnlineAgents() {
    return this.prisma.agent.findMany({
      where: { status: 'online' },
      select: { id: true, name: true, type: true, status: true },
    });
  }
}
