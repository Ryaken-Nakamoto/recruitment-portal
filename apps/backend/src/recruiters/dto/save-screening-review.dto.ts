import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, ValidateNested } from 'class-validator';

class ScreeningScoreDto {
  @IsInt()
  criteriaId: number;

  @IsNumber()
  score: number;
}

export class SaveScreeningReviewDto {
  @IsInt()
  assignmentId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScreeningScoreDto)
  scores: ScreeningScoreDto[];
}
