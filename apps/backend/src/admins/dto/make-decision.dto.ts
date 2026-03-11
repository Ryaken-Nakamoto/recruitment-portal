import { IsEnum } from 'class-validator';
import { AdminDecision } from '../../applications/enums/admin-decision.enum';

export class MakeDecisionDto {
  @IsEnum(AdminDecision)
  decision: AdminDecision;
}
