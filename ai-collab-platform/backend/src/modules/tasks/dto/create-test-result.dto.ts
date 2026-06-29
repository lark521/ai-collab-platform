import { IsString, IsUUID, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestResultDto {
  @IsUUID()
  taskId: string;
  
  @IsString()
  testCase: string;
  
  @IsBoolean()
  passed: boolean;
  
  @IsOptional()
  @IsString()
  detail?: string;
  
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
