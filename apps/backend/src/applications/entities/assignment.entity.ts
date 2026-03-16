import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
  Column,
} from 'typeorm';
import { Relation } from 'typeorm';
import { Recruiter } from '../../recruiters/entities/recruiter.entity';
import { Application } from './application.entity';
import { ApplicationRound } from '../enums/application-round.enum';

@Entity()
@Unique(['recruiter', 'application', 'round'])
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Recruiter, { onDelete: 'CASCADE' })
  recruiter: Relation<Recruiter>;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  application: Relation<Application>;

  @Column({ type: 'varchar', default: ApplicationRound.SCREENING })
  round: ApplicationRound;

  @CreateDateColumn()
  assignedAt: Date;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;
}
