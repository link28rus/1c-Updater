import { IsString, IsNotEmpty, IsOptional, IsIP, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePcDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIP()
  ipAddress: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  adminUsername: string;

  @IsString()
  @IsNotEmpty()
  adminPassword: string;

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


