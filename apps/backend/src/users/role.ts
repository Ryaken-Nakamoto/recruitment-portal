export enum Role {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
}

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [Role.ADMIN]: [Role.ADMIN, Role.RECRUITER],
  [Role.RECRUITER]: [Role.RECRUITER],
};
