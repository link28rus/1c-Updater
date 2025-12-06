import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, ArrayMinSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  distributionId: number;

  @Type(() => Number)
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value.map(v => Number(v)) : value)
  pcIds: number[];
}


