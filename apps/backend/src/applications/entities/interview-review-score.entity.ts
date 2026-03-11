import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm';
import { InterviewReview } from './interview-review.entity';
import { InterviewCriteria } from '../../rubrics/entities/interview-criteria.entity';

@Entity()
@Unique(['review', 'criteria'])
export class InterviewReviewScore {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => InterviewReview, (r) => r.scores, { onDelete: 'CASCADE' })
  review: Relation<InterviewReview>;

  @ManyToOne(() => InterviewCriteria, { onDelete: 'CASCADE' })
  criteria: Relation<InterviewCriteria>;

  @Column({ type: 'float' })
  score: number;
}
