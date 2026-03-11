import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Assignment } from './assignment.entity';
import { ScreeningReviewScore } from './screening-review-score.entity';

@Entity()
export class ScreeningReview {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn()
  assignment: Relation<Assignment>;

  @CreateDateColumn()
  submittedAt: Date;

  @OneToMany(() => ScreeningReviewScore, (s) => s.review, { cascade: true })
  scores: Relation<ScreeningReviewScore[]>;
}
