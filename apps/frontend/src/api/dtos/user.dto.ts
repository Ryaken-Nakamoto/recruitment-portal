import { AccountStatus, Role } from './enums';

export interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  createdDate: string;
}
