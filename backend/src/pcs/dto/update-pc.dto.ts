import { IsString, IsOptional, IsIP, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePcDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  adminUsername?: string;

  @IsString()
  @IsOptional()
  adminPassword?: string;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  groupId?: number;
}


