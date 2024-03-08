import { SetMetadata } from '@nestjs/common';
import { EditFor } from './films.types';

export const EditLock = (lock: EditFor) => SetMetadata('lock', lock);