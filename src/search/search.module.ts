import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { StorageModule } from '../storage/storage.module';
// import { DatabaseModule } from '../database/database.module';

@Module({
	imports: [StorageModule],
	controllers: [SearchController],
	providers: [SearchService],
	exports: [SearchService]
})
export class SearchModule {}
