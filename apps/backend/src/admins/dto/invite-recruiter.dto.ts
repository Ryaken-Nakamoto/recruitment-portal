import { IsEmail } from 'class-validator';

export class InviteRecruiterDto {
  @IsEmail()
  email: string;
}
