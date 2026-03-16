import { IsArray, IsInt } from 'class-validator';

export class BulkRevertDto {
  @IsArray()
  @IsInt({ each: true })
  applicationIds: number[];
}
