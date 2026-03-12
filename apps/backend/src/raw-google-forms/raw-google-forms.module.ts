import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RawGoogleForm } from './entities/raw-google-form.entity';
import { RawGoogleFormsService } from './raw-google-forms.service';
import { RawGoogleFormsController } from './raw-google-forms.controller';
import { UtilModule } from '../util/util.module';
import { ApplicantsModule } from '../applicants/applicants.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RawGoogleForm]),
    UtilModule,
    ApplicantsModule,
    ApplicationsModule,
  ],
  controllers: [RawGoogleFormsController],
  providers: [RawGoogleFormsService],
})
export class RawGoogleFormsModule {}
