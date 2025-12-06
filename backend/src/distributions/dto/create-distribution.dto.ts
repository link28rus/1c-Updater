import { IsString, IsOptional } from 'class-validator';

export class CreateDistributionDto {
  @IsString()
  @IsOptional()
  description?: string;
}




