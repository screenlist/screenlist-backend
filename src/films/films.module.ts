import { Module } from '@nestjs/common';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { PeopleModule } from '../people/people.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
	imports: [
		CompaniesModule,
		UsersModule,
		PlatformsModule,
		PeopleModule,
		DatabaseModule,
		StorageModule
	],
	controllers: [FilmsController],
	providers: [FilmsService]
})
export class FilmsModule {}
