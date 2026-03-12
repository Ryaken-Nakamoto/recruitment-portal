import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  Relation,
} from 'typeorm';
import { IsEmail, IsEnum, IsString } from 'class-validator';
import { AcademicYear } from '../enums/academic-year.enum';
import { Application } from '../../applications/entities/application.entity';

@Entity()
export class Applicant {
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column({ type: 'varchar' })
  name: string;

  @IsEmail()
  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  @IsEnum(AcademicYear)
  academicYear: AcademicYear;

  @Column({ type: 'varchar' })
  major: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => Application, (application) => application.applicant)
  application: Relation<Application>;
}
