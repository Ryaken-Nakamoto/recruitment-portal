import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm';
import { ScreeningReview } from './screening-review.entity';
import { ScreeningCriteria } from '../../rubrics/entities/screening-criteria.entity';

@Entity()
@Unique(['review', 'criteria'])
export class ScreeningReviewScore {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ScreeningReview, (r) => r.scores, { onDelete: 'CASCADE' })
  review: Relation<ScreeningReview>;

  @ManyToOne(() => ScreeningCriteria, { onDelete: 'CASCADE' })
  criteria: Relation<ScreeningCriteria>;

  @Column({ type: 'float' })
  score: number;
}
