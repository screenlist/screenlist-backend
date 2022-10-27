import { SetMetadata } from '@nestjs/common';
import { UserRoles } from './users.types';

export const Roles = (role: UserRoles) => SetMetadata('roles', role);