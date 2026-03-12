import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { ScreeningRubric } from './screening-rubric.entity';

@Entity()
export class ScreeningCriteria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  oneDescription: string;

  @Column({ type: 'text' })
  twoDescription: string;

  @Column({ type: 'text' })
  threeDescription: string;

  @ManyToOne(() => ScreeningRubric, (rubric) => rubric.criteria, {
    nullable: false,
  })
  @JoinColumn({ name: 'rubricId' })
  rubric: Relation<ScreeningRubric>;
}
