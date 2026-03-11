import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteRecruiterDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsEmail()
  email: string;
}
