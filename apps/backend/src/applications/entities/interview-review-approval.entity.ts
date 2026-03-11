import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm';
import { InterviewReview } from './interview-review.entity';
import { Assignment } from './assignment.entity';

@Entity()
@Unique(['review', 'assignment'])
export class InterviewReviewApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => InterviewReview, (r) => r.approvals, { onDelete: 'CASCADE' })
  review: Relation<InterviewReview>;

  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  assignment: Relation<Assignment>;

  @Column({ type: 'boolean', nullable: true })
  approved: boolean | null;

  @Column({ type: 'timestamp', nullable: true })
  decidedAt: Date | null;
}
