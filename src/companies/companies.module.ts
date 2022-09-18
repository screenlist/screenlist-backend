import { Module } from '@nestjs/common';
import { Company } from './companies.entity';
import { CompaniesService } from './companies.service';

@Module({
	providers: [CompaniesService]
})
export class CompaniesModule {}
