import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecruitersModule } from './recruiters/recruiters.module';
import { AdminsModule } from './admins/admins.module';
import { ApplicantsModule } from './applicants/applicants.module';
import { ApplicationsModule } from './applications/applications.module';
import { EmailsModule } from './emails/emails.module';
import { RubricsModule } from './rubrics/rubrics.module';
import AppDataSource from './data-source';
import { AuthModule } from './auth/auth.module';
import { AuthenticationMiddleware } from './auth/middleware/authentication.middleware';
import { SeedModule } from './seed/seed.module';
import { RawGoogleFormsModule } from './raw-google-forms/raw-google-forms.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({ ...AppDataSource.options, migrations: [] }),
    RecruitersModule,
    AdminsModule,
    ApplicantsModule,
    ApplicationsModule,
    EmailsModule,
    RubricsModule,
    AuthModule,
    SeedModule,
    RawGoogleFormsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthenticationMiddleware).forRoutes('*');
  }
}
