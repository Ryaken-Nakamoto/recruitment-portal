import { Module } from '@nestjs/common';
import { CognitoService } from './cognito/cognito.service';
import { CognitoWrapper } from './cognito/cognito.wrapper';
import { S3Service } from './s3/s3.service';
import { NodemailerService } from './nodemailer/nodemailer.service';

@Module({
  providers: [CognitoService, CognitoWrapper, S3Service, NodemailerService],
  exports: [CognitoService, CognitoWrapper, S3Service, NodemailerService],
})
export class UtilModule {}
