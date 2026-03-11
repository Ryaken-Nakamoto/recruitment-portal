import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { IsEmail, IsEnum } from 'class-validator';
import { AcademicYear } from '../enums/academic-year.enum';
import { Application } from '../../applications/entities/application.entity';

@Entity()
export class Applicant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @IsEmail()
  @Column({ unique: true })
  email: string;

  @Column()
  graduationYear: number;

  @Column({ type: 'varchar' })
  @IsEnum(AcademicYear)
  academicYear: AcademicYear;

  @Column()
  major: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => Application, (application) => application.applicant)
  application: Application;
}
