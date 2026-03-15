import { Module } from '@nestjs/common';
import { CognitoService } from './cognito/cognito.service';
import { CognitoWrapper } from './cognito/cognito.wrapper';
import { S3Service } from './s3/s3.service';
import { SesService } from './ses/ses.service';

@Module({
  providers: [CognitoService, CognitoWrapper, S3Service, SesService],
  exports: [CognitoService, CognitoWrapper, S3Service, SesService],
})
export class UtilModule {}
