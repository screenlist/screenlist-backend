import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../database/database.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { AuthModule } from '../auth/auth.module';
import { PeopleModule } from '../people/people.module';
import { CompaniesModule } from '../companies/companies.module';
import { FilmsModule } from '../films/films.module';
import { UsersModule } from '../users/users.module';

@Module({
	imports: [
		StorageModule,
		DatabaseModule,
		PlatformsModule,
		AuthModule,
		PeopleModule,
		CompaniesModule,
		FilmsModule,
		UsersModule
	],
	controllers: [SeriesController],
	providers: [SeriesService]
})
export class SeriesModule {}
