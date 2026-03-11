import { IsOptional, IsString } from 'class-validator';

export class UpdateEmailDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
