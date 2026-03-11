import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { InterviewRubric } from './interview-rubric.entity';

@Entity()
export class InterviewCriteria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  criteria: string;

  @Column()
  maxScore: number;

  @ManyToOne(() => InterviewRubric, (rubric) => rubric.criteria, {
    nullable: false,
  })
  @JoinColumn({ name: 'rubricId' })
  rubric: Relation<InterviewRubric>;
}
