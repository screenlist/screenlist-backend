import { SetMetadata } from '@nestjs/common';
import { UserRoles } from '../users/users.types';

export const Roles = (role: UserRoles) => SetMetadata('roles', role);