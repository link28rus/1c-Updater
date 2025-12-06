import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}




