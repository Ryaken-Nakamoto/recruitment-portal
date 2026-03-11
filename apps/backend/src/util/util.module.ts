import { Module } from '@nestjs/common';
import { CognitoService } from './cognito/cognito.service';
import { CognitoWrapper } from './cognito/cognito.wrapper';

@Module({
  providers: [CognitoService, CognitoWrapper],
  exports: [CognitoService, CognitoWrapper],
})
export class UtilModule {}
