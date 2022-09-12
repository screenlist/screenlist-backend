import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import { Film, FilmHistory } from './films.entity';
import { CompaniesModule } from '../companies/companies.module'

@Module({
	imports: [TypeOrmModule.forFeature([Film, FilmHistory]), CompaniesModule],
	controllers: [FilmsController],
	providers: [FilmsService]
})
export class FilmsModule {}
