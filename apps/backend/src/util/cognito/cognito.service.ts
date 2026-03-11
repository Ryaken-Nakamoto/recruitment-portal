import { Injectable } from '@nestjs/common';
import { CognitoWrapper } from './cognito.wrapper';

@Injectable()
export class CognitoService {
  constructor(private readonly cognitoWrapper: CognitoWrapper) {}

  async validateToken(token: string): Promise<Record<string, unknown>> {
    return this.cognitoWrapper.validate(token);
  }

  async adminCreateUser(email: string): Promise<void> {
    return this.cognitoWrapper.adminCreateUser(email);
  }
}
