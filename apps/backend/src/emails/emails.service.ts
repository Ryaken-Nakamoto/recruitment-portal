import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Email } from './entities/email.entity';
import { UpdateEmailDto } from './dto/update-email.dto';
import { AUTO_VARIABLES, AutoVariable } from './constants/auto-variables';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
  ) {}

  async findAll(): Promise<Email[]> {
    return this.emailRepo.find();
  }

  async findOne(id: number): Promise<Email> {
    const email = await this.emailRepo.findOneBy({ id });
    if (!email) {
      throw new NotFoundException(`Email template with id ${id} not found`);
    }
    return email;
  }

  async update(id: number, dto: UpdateEmailDto): Promise<Email> {
    const email = await this.findOne(id);

    if (dto.subject !== undefined) {
      email.subject = dto.subject;
    }

    if (dto.body !== undefined) {
      email.body = dto.body;
      email.requiredVariables = this.parseRequiredVariables(dto.body);
    }

    const saved = await this.emailRepo.save(email);
    this.logger.log(`Email template ${id} updated`);
    return saved;
  }

  getAutoVariables(): string[] {
    return [...AUTO_VARIABLES];
  }

  private parseRequiredVariables(body: string): string[] {
    const matches = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    return [...new Set(matches)].filter(
      (v) => !AUTO_VARIABLES.includes(v as AutoVariable),
    );
  }
}
