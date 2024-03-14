import { SetMetadata } from '@nestjs/common';
import { EditFor } from 'src/films/films.types';

export const EditLock = (lock: EditFor) => SetMetadata('lock', lock);