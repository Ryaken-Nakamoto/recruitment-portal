import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Assignment } from './assignment.entity';
import { ScreeningReviewScore } from './screening-review-score.entity';
import { ScreeningReviewStatus } from '../enums/screening-review-status.enum';

@Entity()
export class ScreeningReview {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn()
  assignment: Relation<Assignment>;

  @Column({ type: 'varchar', default: ScreeningReviewStatus.DRAFT })
  status: ScreeningReviewStatus;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @OneToMany(() => ScreeningReviewScore, (s) => s.review, { cascade: true })
  scores: Relation<ScreeningReviewScore[]>;
}
