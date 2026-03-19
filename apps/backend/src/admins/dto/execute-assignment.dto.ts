import { Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested, ArrayMinSize } from 'class-validator';

export class AssignmentPairDto {
  @IsInt()
  appId: number;

  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  recruiterIds: number[];
}

export class ExecuteAssignmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentPairDto)
  @ArrayMinSize(1)
  pairs: AssignmentPairDto[];
}
