import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DefinitelyAuthorizedRequest } from '../types/authorized-request';

export const ReqUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<DefinitelyAuthorizedRequest>();
    return request.user;
  },
);
