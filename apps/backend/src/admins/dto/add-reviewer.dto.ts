import { IsInt, IsPositive } from 'class-validator';

export class AddReviewerDto {
  @IsInt()
  @IsPositive()
  applicationId: number;

  @IsInt()
  @IsPositive()
  recruiterId: number;
}
