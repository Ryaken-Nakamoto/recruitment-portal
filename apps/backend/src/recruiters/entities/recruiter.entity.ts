import { ChildEntity } from 'typeorm';

import { User } from '../../users/user.entity';
import { Role } from '../../users/role';

@ChildEntity(Role.RECRUITER)
export class Recruiter extends User {}
