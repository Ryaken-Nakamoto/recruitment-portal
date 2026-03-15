import { IsArray, IsInt, Min } from 'class-validator';

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
}
