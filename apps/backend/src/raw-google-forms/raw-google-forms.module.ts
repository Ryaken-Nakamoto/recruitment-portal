import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RawGoogleForm } from './entities/raw-google-form.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RawGoogleForm])],
})
export class RawGoogleFormsModule {}
