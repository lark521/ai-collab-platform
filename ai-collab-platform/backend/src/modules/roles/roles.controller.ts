import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@ApiTags('roles')
@Controller('api/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: '创建角色' })
  create(@Body() data: CreateRoleDto) {
    return this.rolesService.create(data);
  }

  @Get()
  @ApiOperation({ summary: '获取所有角色' })
  findAll(@Query('search') search?: string, @Query('isActive') isActive?: string) {
    return this.rolesService.findAll({
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('active')
  @ApiOperation({ summary: '获取所有活跃角色' })
  getActive() {
    return this.rolesService.getActiveRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新角色' })
  update(@Param('id') id: string, @Body() data: UpdateRoleDto) {
    return this.rolesService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
