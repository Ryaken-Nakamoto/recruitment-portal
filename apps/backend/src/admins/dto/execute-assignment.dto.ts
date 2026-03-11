import { IsArray, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ExecuteAssignmentDto {
  @IsArray()
  @IsInt({ each: true })
  applicationIds: number[];

  @IsArray()
  @IsInt({ each: true })
  recruiterIds: number[];

  @IsInt()
  @Min(1)
  recruitersPerApp: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
