import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { UtilModule } from '../util/util.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UtilModule],
  controllers: [AuthController],
  providers: [AuthService, UsersService],
  exports: [AuthService],
})
export class AuthModule {}
