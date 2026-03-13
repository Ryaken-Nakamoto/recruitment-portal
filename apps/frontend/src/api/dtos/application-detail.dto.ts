import {
  ApplicationRound,
  RoundStatus,
  FinalDecision,
  AcademicYear,
} from './enums';

export enum FormYear {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
  FOURTH = 'fourth',
  FIFTH_PLUS = 'fifth_plus',
}

export enum College {
  KHOURY = 'khoury',
  DAMORE_MCKIM = 'damore_mckim',
  CAMD = 'camd',
  SCIENCE = 'science',
  ENGINEERING = 'engineering',
  BOUVE = 'bouve',
  CSSH = 'cssh',
}

export enum CodingExperience {
  FUNDIES_1 = 'fundies_1',
  FUNDIES_2 = 'fundies_2',
  OOD = 'ood',
  SOFTWARE_DEVELOPMENT = 'software_development',
  SOFTWARE_ENGINEERING = 'software_engineering',
  WEB_DEVELOPMENT = 'web_development',
  DATABASES = 'databases',
  INTERMEDIATE_DATA = 'intermediate_data',
  ADVANCED_DATA = 'advanced_data',
  OTHER = 'other',
}

export enum HearAboutC4C {
  INSTAGRAM = 'instagram',
  WORD_OF_MOUTH = 'word_of_mouth',
  EVENT = 'event',
  KHOURY_WEBSITE = 'khoury_website',
  MEMBER_REFERRAL = 'member_referral',
  OTHER = 'other',
}

export const FormYearDisplay: Record<FormYear, string> = {
  [FormYear.FIRST]: 'First Year',
  [FormYear.SECOND]: 'Second Year',
  [FormYear.THIRD]: 'Third Year',
  [FormYear.FOURTH]: 'Fourth Year',
  [FormYear.FIFTH_PLUS]: 'Fifth Year+',
};

export const CollegeDisplay: Record<College, string> = {
  [College.KHOURY]: 'Khoury College of Computer Sciences',
  [College.DAMORE_MCKIM]: "D'Amore McKim School of Business",
  [College.CAMD]: 'College of Arts, Media, and Design',
  [College.SCIENCE]: 'College of Science',
  [College.ENGINEERING]: 'College of Engineering',
  [College.BOUVE]: 'Bouve College of Health Sciences',
  [College.CSSH]: 'College of Social Sciences and Humanities',
};

export const CodingExperienceDisplay: Record<CodingExperience, string> = {
  [CodingExperience.FUNDIES_1]: 'Fundies 1/Intro (CS2500/CS2000)',
  [CodingExperience.FUNDIES_2]: 'Fundies 2/Intro 1 (CS2510/CS2100)',
  [CodingExperience.OOD]: 'OOD/Intro 2 (CS3500/CS3100)',
  [CodingExperience.SOFTWARE_DEVELOPMENT]: 'Software Development (CS4500)',
  [CodingExperience.SOFTWARE_ENGINEERING]: 'Software Engineering (CS4530)',
  [CodingExperience.WEB_DEVELOPMENT]: 'Web Development (CS4550)',
  [CodingExperience.DATABASES]: 'Introduction to Databases (CS3200)',
  [CodingExperience.INTERMEDIATE_DATA]:
    'Intermediate Programming with Data (DS2500)',
  [CodingExperience.ADVANCED_DATA]: 'Advanced Programming with Data (DS3500)',
  [CodingExperience.OTHER]: 'Other',
};

export const HearAboutC4CDisplay: Record<HearAboutC4C, string> = {
  [HearAboutC4C.INSTAGRAM]: 'Instagram',
  [HearAboutC4C.WORD_OF_MOUTH]: 'Word of Mouth',
  [HearAboutC4C.EVENT]: 'Event (info session, demo day, fall fest, etc.)',
  [HearAboutC4C.KHOURY_WEBSITE]: 'Khoury/Northeastern Website',
  [HearAboutC4C.MEMBER_REFERRAL]: 'Member Referral',
  [HearAboutC4C.OTHER]: 'Other',
};

export interface RawGoogleFormDto {
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
  submittedAt: string;
}

export interface ApplicationDetailApplicantDto {
  id: number;
  name: string;
  email: string;
  academicYear: AcademicYear;
  major: string;
}

export interface ApplicationDetailResponse {
  id: number;
  round: ApplicationRound;
  roundStatus: RoundStatus;
  finalDecision: FinalDecision | null;
  submittedAt: string;
  applicant: ApplicationDetailApplicantDto;
  rawGoogleForm: RawGoogleFormDto;
}
