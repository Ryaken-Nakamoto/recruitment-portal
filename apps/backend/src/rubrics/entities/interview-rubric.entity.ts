import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { InterviewCriteria } from './interview-criteria.entity';

@Entity()
export class InterviewRubric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => InterviewCriteria, (criteria) => criteria.rubric, {
    cascade: true,
  })
  criteria: InterviewCriteria[];
}
