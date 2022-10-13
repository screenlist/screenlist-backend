import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
	imports: [AuthModule, DatabaseModule, StorageModule],
	providers: [CompaniesService],
	controllers: [CompaniesController],
	exports: [CompaniesService]
})
export class CompaniesModule {}
