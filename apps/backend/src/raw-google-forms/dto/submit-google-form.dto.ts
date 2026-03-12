import {
  IsEmail,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
} from 'class-validator';
import { FormYear } from '../enums/form-year.enum';
import { College } from '../enums/college.enum';
import { CodingExperience } from '../enums/coding-experience.enum';
import { HearAboutC4C } from '../enums/hear-about-c4c.enum';

export class SubmitGoogleFormDto {
  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsEnum(FormYear)
  year: FormYear;

  @IsEnum(College)
  college: College;

  @IsString()
  major: string;

  @IsArray()
  @IsEnum(CodingExperience, { each: true })
  codingExperience: CodingExperience[];

  @IsOptional()
  @IsString()
  codingExperienceOther?: string | null;

  @IsString()
  resumeUrl: string;

  @IsString()
  whyC4C: string;

  @IsOptional()
  @IsString()
  selfStartedProject?: string | null;

  @IsOptional()
  @IsString()
  communityImpact?: string | null;

  @IsOptional()
  @IsString()
  teamConflict?: string | null;

  @IsOptional()
  @IsString()
  otherExperiences?: string | null;

  @IsArray()
  @IsEnum(HearAboutC4C, { each: true })
  heardAboutC4C: HearAboutC4C[];

  @IsOptional()
  @IsString()
  heardAboutC4COther?: string | null;

  @IsString()
  appliedBefore: string;

  @IsString()
  fallCommitments: string;

  @IsOptional()
  @IsString()
  questionsOrConcerns?: string | null;
}
