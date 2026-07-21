import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
// কাস্টম @Roles() ডেকোরেটর যা মেটাডাটা হিসেবে রোল সেভ করবে
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
