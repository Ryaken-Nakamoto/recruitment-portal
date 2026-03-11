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

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @IsEmail()
  @Column()
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
