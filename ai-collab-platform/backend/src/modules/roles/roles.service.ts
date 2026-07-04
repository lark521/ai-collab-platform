import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description || '',
        promptTemplate: data.promptTemplate || '',
        reportTo: data.reportTo || null,
        responsibilities: data.responsibilities || '',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async findAll(params?: { search?: string; isActive?: boolean }) {
    const { search, isActive } = params || {};
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { responsibilities: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.prisma.role.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { taskRoles: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { taskRoles: true } },
      },
    });
  }

  async update(id: string, data: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  // 获取所有活跃角色（用于下拉选择）
  async getActiveRoles() {
    return this.prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
  }
}
