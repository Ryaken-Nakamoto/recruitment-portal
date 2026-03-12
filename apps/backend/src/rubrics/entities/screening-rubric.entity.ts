import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ScreeningCriteria } from './screening-criteria.entity';

@Entity()
export class ScreeningRubric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @OneToMany(() => ScreeningCriteria, (criteria) => criteria.rubric, {
    cascade: true,
  })
  criteria: ScreeningCriteria[];
}
