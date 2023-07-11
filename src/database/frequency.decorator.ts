import { SetMetadata } from '@nestjs/common';

export const Frequency = (kind: string) => SetMetadata('frequency', kind);