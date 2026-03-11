import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { ApplicationRound } from '../../applications/enums/application-round.enum';

class InterviewScoreDto {
  @IsInt()
  criteriaId: number;

  @IsNumber()
  score: number;
}

export class SaveInterviewReviewDto {
  @IsInt()
  applicationId: number;

  @IsEnum(ApplicationRound)
  round: ApplicationRound;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewScoreDto)
  scores: InterviewScoreDto[];
}

export class ApproveInterviewReviewDto {
  @IsBoolean()
  approved: boolean;
}
