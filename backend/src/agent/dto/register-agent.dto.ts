import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class RegisterAgentDto {
  @IsInt()
  @IsNotEmpty()
  pcId: number;

  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  hostname: string;

  @IsString()
  @IsNotEmpty()
  osVersion: string;

  @IsString()
  @IsOptional()
  lastOneCVersion?: string;

  @IsString()
  @IsOptional()
  oneCArchitecture?: string;
}




