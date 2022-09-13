import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform, WatchLink } from './platforms.entity';
import { PlatformsService } from './platforms.service';

@Module({
	imports: [TypeOrmModule.forFeature([Platform, WatchLink])],
	providers: [PlatformsService],
	exports: [TypeOrmModule]
})
export class PlatformsModule {}
