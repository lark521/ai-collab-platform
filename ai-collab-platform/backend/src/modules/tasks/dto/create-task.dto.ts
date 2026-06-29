import { IsString, IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTaskDto {
  @IsString()
  title: string;
  
  @IsOptional()
  @IsString()
  description?: string;
  
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
  
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class AssignRoleDto {
  @IsUUID()
  taskId: string;
  
  @IsUUID()
  agentId: string;
  
  @IsString()
  roleName: string; // planner, executor, reviewer, tester
}
