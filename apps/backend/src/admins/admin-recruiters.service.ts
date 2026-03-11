import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Recruiter } from '../recruiters/entities/recruiter.entity';
import { User } from '../users/user.entity';
import { AccountStatus } from '../users/status';
import { CognitoService } from '../util/cognito/cognito.service';

@Injectable()
export class AdminRecruitersService {
  constructor(
    @InjectRepository(Recruiter)
    private readonly recruiterRepo: Repository<Recruiter>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly cognitoService: CognitoService,
  ) {}

  async listRecruiters(page: number, limit: number) {
    const [data, total] = await this.recruiterRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdDate: 'DESC' },
    });
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async inviteRecruiter(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<Recruiter> {
    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const recruiter = this.recruiterRepo.create({
      firstName,
      lastName,
      email,
      accountStatus: AccountStatus.INVITE_SENT,
    });
    await this.recruiterRepo.save(recruiter);

    await this.cognitoService.adminCreateUser(email);

    return recruiter;
  }

  async deactivateRecruiter(id: number): Promise<Recruiter> {
    const recruiter = await this.recruiterRepo.findOneBy({ id });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter with id ${id} not found`);
    }
    recruiter.accountStatus = AccountStatus.DEACTIVATED;
    return this.recruiterRepo.save(recruiter);
  }

  async reactivateRecruiter(id: number): Promise<Recruiter> {
    const recruiter = await this.recruiterRepo.findOneBy({ id });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter with id ${id} not found`);
    }
    recruiter.accountStatus = AccountStatus.ACTIVATED;
    return this.recruiterRepo.save(recruiter);
  }
}
