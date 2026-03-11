import { AccountStatus, Role } from './enums';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  createdDate: string;
}
