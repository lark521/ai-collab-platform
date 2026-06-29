import { IsString, IsEnum, IsJSON, IsOptional, IsUrl, IsBoolean } from 'class-validator';

export enum AgentType {
  OPENCLAW = 'openclaw',
  HERMES = 'hermes',
  CUSTOM = 'custom',
}

export class CreateAgentDto {
  @IsString()
  name: string;
  
  @IsEnum(AgentType)
  type: AgentType;
  
  @IsOptional()
  @IsJSON()
  config?: Record<string, any>;

  // 远程连接字段
  @IsOptional()
  @IsUrl({}, { message: 'remoteUrl must be a valid URL' })
  remoteUrl?: string;

  @IsOptional()
  @IsString()
  adapterType?: string;
}
