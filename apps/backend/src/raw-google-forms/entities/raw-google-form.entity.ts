import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  Relation,
} from 'typeorm';
import { IsEmail, IsEnum } from 'class-validator';
import { FormYear } from '../enums/form-year.enum';
import { College } from '../enums/college.enum';
import { CodingExperience } from '../enums/coding-experience.enum';
import { HearAboutC4C } from '../enums/hear-about-c4c.enum';
import { Application } from '../../applications/entities/application.entity';

@Entity()
export class RawGoogleForm {
  @PrimaryGeneratedColumn()
  id: number;

  // ── Section 1: Basic Info ─────────────────────────────────────
  @IsEmail()
  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar' })
  @IsEnum(FormYear)
  year: FormYear;

  @Column({ type: 'varchar' })
  @IsEnum(College)
  college: College;

  @Column({ type: 'varchar' })
  major: string;

  // Multi-select checkboxes — stored as Postgres text[]
  @Column({ type: 'text', array: true, default: '{}' })
  codingExperience: CodingExperience[];

  // Free-text entry when CodingExperience.OTHER is selected
  @Column({ type: 'varchar', nullable: true, default: null })
  codingExperienceOther: string | null;

  // Full S3 URL to the uploaded PDF
  @Column({ type: 'varchar' })
  resumeUrl: string;

  // ── Section 2: Short Answer Responses ────────────────────────
  // Only whyC4C is required on the form
  @Column({ type: 'text' })
  whyC4C: string;

  @Column({ type: 'text', nullable: true, default: null })
  selfStartedProject: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  communityImpact: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  teamConflict: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  otherExperiences: string | null;

  // ── Section 3: C4C Information ───────────────────────────────
  // Multi-select checkboxes — stored as Postgres text[]
  @Column({ type: 'text', array: true, default: '{}' })
  heardAboutC4C: HearAboutC4C[];

  // Holds member name (when MEMBER_REFERRAL selected) or free-text other
  @Column({ type: 'varchar', nullable: true, default: null })
  heardAboutC4COther: string | null;

  @Column({ type: 'boolean' })
  appliedBefore: boolean;

  @Column({ type: 'text' })
  fallCommitments: string;

  @Column({ type: 'text', nullable: true, default: null })
  questionsOrConcerns: string | null;

  @CreateDateColumn()
  submittedAt: Date;

  @OneToOne(() => Application, (app) => app.rawGoogleForm)
  application: Relation<Application>;
}
