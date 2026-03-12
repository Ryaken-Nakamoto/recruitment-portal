import { Injectable } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import CognitoAuthConfig from '../../auth/aws-exports';

@Injectable()
export class CognitoWrapper {
  private readonly verifier: ReturnType<typeof CognitoJwtVerifier.create>;
  private readonly cognitoClient: CognitoIdentityProviderClient;

  constructor() {
    const clientIds = [
      CognitoAuthConfig.clientId,
      process.env.NX_COGNITO_PUBLIC_CLIENT_ID,
    ].filter(Boolean) as string[];

    this.verifier = CognitoJwtVerifier.create({
      userPoolId: CognitoAuthConfig.userPoolId,
      tokenUse: 'id',
      clientId: clientIds,
    });

    this.cognitoClient = new CognitoIdentityProviderClient({
      region: CognitoAuthConfig.region,
    });
  }

  async validate(token: string): Promise<Record<string, unknown>> {
    const payload = await this.verifier.verify(token);
    return payload as unknown as Record<string, unknown>;
  }

  async adminCreateUser(email: string): Promise<void> {
    const command = new AdminCreateUserCommand({
      UserPoolId: CognitoAuthConfig.userPoolId,
      Username: email,
      DesiredDeliveryMediums: ['EMAIL'],
    });
    await this.cognitoClient.send(command);
  }
}
