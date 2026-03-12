import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RawGoogleFormsService } from './raw-google-forms.service';
import { SubmitGoogleFormDto } from './dto/submit-google-form.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';

@Controller('raw-google-forms')
export class RawGoogleFormsController {
  constructor(private readonly rawGoogleFormsService: RawGoogleFormsService) {}

  @Post('upload-resume')
  @Auth(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    return this.rawGoogleFormsService.uploadResume(file);
  }

  @Post('submit')
  @Auth(Role.ADMIN)
  async submitForm(@Body() submitGoogleFormDto: SubmitGoogleFormDto) {
    return this.rawGoogleFormsService.submitGoogleForm(submitGoogleFormDto);
  }
}
