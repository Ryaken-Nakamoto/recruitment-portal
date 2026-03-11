import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { IsEnum } from 'class-validator';
import { ApplicationRound } from '../enums/application-round.enum';
import { RoundStatus } from '../enums/round-status.enum';
import { FinalDecision } from '../enums/final-decision.enum';
import { Applicant } from '../../applicants/entities/applicant.entity';

type ApplicationAnswer = { question: string; answer: string };

@Entity()
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Applicant, (applicant) => applicant.application)
  @JoinColumn()
  applicant: Applicant;

  @Column({ type: 'jsonb' })
  answers: ApplicationAnswer[];

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
