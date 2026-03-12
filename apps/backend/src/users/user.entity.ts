import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  TableInheritance,
  CreateDateColumn,
} from 'typeorm';
import { IsEmail, IsEnum } from 'class-validator';
import { Role } from './role';
import { AccountStatus } from './status';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'role' } })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @IsEmail()
  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  @IsEnum(Role)
  role: Role;

  @Column({ type: 'varchar' })
  @IsEnum(AccountStatus)
  accountStatus: AccountStatus;

  @CreateDateColumn()
  createdDate: Date;
}
