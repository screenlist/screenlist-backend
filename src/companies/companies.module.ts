import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './companies.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Company])]
})
export class CompaniesModule {}
