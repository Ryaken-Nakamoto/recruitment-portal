import { IsArray, IsInt } from 'class-validator';

export class BulkSendEmailDto {
  @IsArray()
  @IsInt({ each: true })
  applicationIds: number[];
}
