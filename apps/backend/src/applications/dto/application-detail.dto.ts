import { ApplicationRound } from '../enums/application-round.enum';
import { RoundStatus } from '../enums/round-status.enum';
import { FinalDecision } from '../enums/final-decision.enum';
import { AcademicYear } from '../../applicants/enums/academic-year.enum';
import { FormYear } from '../../raw-google-forms/enums/form-year.enum';
import { College } from '../../raw-google-forms/enums/college.enum';
import { CodingExperience } from '../../raw-google-forms/enums/coding-experience.enum';
import { HearAboutC4C } from '../../raw-google-forms/enums/hear-about-c4c.enum';

export class ApplicationDetailApplicantDto {
  id: number;
  name: string;
  email: string;
  academicYear: AcademicYear;
  major: string;
}

export class ApplicationDetailRawGoogleFormDto {
  id: number;
  email: string;
  fullName: string;
  year: FormYear;
  college: College;
  major: string;
  codingExperience: CodingExperience[];
  codingExperienceOther: string | null;
  whyC4C: string;
  selfStartedProject: string | null;
  communityImpact: string | null;
  teamConflict: string | null;
  otherExperiences: string | null;
  heardAboutC4C: HearAboutC4C[];
  heardAboutC4COther: string | null;
  appliedBefore: string;
  fallCommitments: string;
  questionsOrConcerns: string | null;
  submittedAt: Date;
}

export class ApplicationDetailDto {
  id: number;
  round: ApplicationRound;
  roundStatus: RoundStatus;
  finalDecision: FinalDecision | null;
  submittedAt: Date;
  applicant: ApplicationDetailApplicantDto;
  rawGoogleForm: ApplicationDetailRawGoogleFormDto;
}
