import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform, WatchLink } from './platforms.entity'

@Module({
	imports: [TypeOrmModule.forFeature([Platform, WatchLink])]
})
export class PlatformsModule {}
