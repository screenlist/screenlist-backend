import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../database/database.module';

@Module({
	imports: [
		StorageModule,
		DatabaseModule
	],
	controllers: [SeriesController],
	providers: [SeriesService]
})
export class SeriesModule {}
