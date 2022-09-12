import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './companies.entity';
import { CompaniesService } from './companies.service';

@Module({
	imports: [TypeOrmModule.forFeature([Company])],
	providers: [CompaniesService],
	exports: [TypeOrmModule]
})
export class CompaniesModule {}
