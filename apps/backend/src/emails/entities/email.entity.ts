import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { IsEnum } from 'class-validator';
import { ApplicationRound } from '../../applications/enums/application-round.enum';
import { FinalDecision } from '../../applications/enums/final-decision.enum';

@Entity()
export class Email {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar' })
  @IsEnum(ApplicationRound)
  applicationStage: ApplicationRound;

  @Column({ type: 'varchar' })
  @IsEnum(FinalDecision)
  decision: FinalDecision;

  @Column({ type: 'text', array: true, default: '{}' })
  requiredVariables: string[];

  @Column({ type: 'jsonb', default: '{}' })
  defaultContext: Record<string, string>;
}
