import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  role: Role;
  login: string;
}
