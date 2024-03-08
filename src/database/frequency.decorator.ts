import { SetMetadata } from '@nestjs/common';
import { Collection } from './database.types';

export const Frequency = (kind: Collection) => SetMetadata('hit', kind);