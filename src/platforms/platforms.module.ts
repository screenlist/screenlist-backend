import { Module } from '@nestjs/common';
import { PlatformsService } from './platforms.service';
import { PlatformsController } from './platforms.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
	imports: [AuthModule, DatabaseModule, StorageModule],
	providers: [PlatformsService],
	controllers: [PlatformsController],
	exports: [PlatformsService]
})
export class PlatformsModule {}
