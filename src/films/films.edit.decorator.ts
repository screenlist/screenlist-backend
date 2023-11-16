import { SetMetadata } from '@nestjs/common';

export const EditLock = (lock: boolean) => SetMetadata('lock', lock);