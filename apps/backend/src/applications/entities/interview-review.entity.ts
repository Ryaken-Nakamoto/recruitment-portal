import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm';
import { Application } from './application.entity';
import { ApplicationRound } from '../enums/application-round.enum';
import { InterviewReviewStatus } from '../enums/interview-review-status.enum';
import { Recruiter } from '../../recruiters/entities/recruiter.entity';
import { InterviewReviewScore } from './interview-review-score.entity';
import { InterviewReviewApproval } from './interview-review-approval.entity';

@Entity()
@Unique(['application', 'round'])
export class InterviewReview {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  application: Relation<Application>;

  @Column({ type: 'varchar' })
  round: ApplicationRound;

  @ManyToOne(() => Recruiter, { nullable: true, onDelete: 'SET NULL' })
  submittedBy: Relation<Recruiter> | null;

  @Column({ type: 'varchar', default: InterviewReviewStatus.DRAFT })
  status: InterviewReviewStatus;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @OneToMany(() => InterviewReviewScore, (s) => s.review, { cascade: true })
  scores: Relation<InterviewReviewScore[]>;

  @OneToMany(() => InterviewReviewApproval, (a) => a.review, { cascade: true })
  approvals: Relation<InterviewReviewApproval[]>;
}
