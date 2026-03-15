import { IsString } from 'class-validator';

export class SendEmailDto {
  @IsString()
  subject: string;

  @IsString()
  body: string;
}
