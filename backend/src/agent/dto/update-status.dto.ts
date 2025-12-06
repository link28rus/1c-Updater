import { IsString, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsOptional()
  lastOneCVersion?: string;

  @IsString()
  @IsOptional()
  oneCArchitecture?: string;
}




