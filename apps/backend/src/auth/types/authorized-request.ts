import { Request } from 'express';
import { User } from '../../users/user.entity';

export type PossiblyAuthorizedRequest = Request & { user?: User };
export type DefinitelyAuthorizedRequest = Request & { user: User };
