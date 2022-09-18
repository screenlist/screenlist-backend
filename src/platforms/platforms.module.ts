import { Module } from '@nestjs/common';
import { Platform, WatchLink } from './platforms.entity';
import { PlatformsService } from './platforms.service';

@Module({
	providers: [PlatformsService],
})
export class PlatformsModule {}
