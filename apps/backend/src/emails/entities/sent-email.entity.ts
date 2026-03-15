import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';
import { ApplicationRound } from '../../applications/enums/application-round.enum';
import { FinalDecision } from '../../applications/enums/final-decision.enum';

@Entity()
export class SentEmail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn()
  application: Relation<Application>;

  @Column({ type: 'int' })
  applicationId: number;

  @Column({ type: 'varchar' })
  toEmail: string;

  @Column({ type: 'varchar' })
  fromEmail: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar' })
  applicationStage: ApplicationRound;

  @Column({ type: 'varchar', nullable: true, default: null })
  finalDecision: FinalDecision | null;

  @CreateDateColumn()
  sentAt: Date;
}
