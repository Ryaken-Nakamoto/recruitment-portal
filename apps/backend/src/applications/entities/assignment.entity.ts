import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Relation } from 'typeorm';
import { Recruiter } from '../../recruiters/entities/recruiter.entity';
import { Application } from './application.entity';

@Entity()
@Unique(['recruiter', 'application'])
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Recruiter, { onDelete: 'CASCADE' })
  recruiter: Relation<Recruiter>;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  application: Relation<Application>;

  @CreateDateColumn()
  assignedAt: Date;
}
