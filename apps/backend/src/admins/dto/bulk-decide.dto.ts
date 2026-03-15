import { IsArray, IsEnum, IsInt } from 'class-validator';
import { AdminDecision } from '../../applications/enums/admin-decision.enum';

export class BulkDecideDto {
  @IsArray()
  @IsInt({ each: true })
  applicationIds: number[];

  @IsEnum(AdminDecision)
  decision: AdminDecision;
}
