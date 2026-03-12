import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Relation,
} from 'typeorm';
import { IsEnum } from 'class-validator';
import { ApplicationRound } from '../enums/application-round.enum';
import { RoundStatus } from '../enums/round-status.enum';
import { FinalDecision } from '../enums/final-decision.enum';
import { Applicant } from '../../applicants/entities/applicant.entity';
import { RawGoogleForm } from '../../raw-google-forms/entities/raw-google-form.entity';

@Entity()
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Applicant, (applicant) => applicant.application)
  @JoinColumn()
  applicant: Relation<Applicant>;

  @OneToOne(() => RawGoogleForm, (form) => form.application)
  @JoinColumn()
  rawGoogleForm: Relation<RawGoogleForm>;

  @Column({ type: 'varchar', default: ApplicationRound.SCREENING })
  @IsEnum(ApplicationRound)
  round: ApplicationRound;

  @Column({ type: 'varchar', default: RoundStatus.PENDING })
  @IsEnum(RoundStatus)
  roundStatus: RoundStatus;

  @Column({ type: 'varchar', nullable: true, default: null })
  @IsEnum(FinalDecision)
  finalDecision: FinalDecision | null;

  @CreateDateColumn()
  submittedAt: Date;
}
