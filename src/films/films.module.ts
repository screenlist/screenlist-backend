import { Module } from '@nestjs/common';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { PeopleModule } from '../people/people.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';


@Module({
	imports: [
		CompaniesModule,
		UsersModule,
		PeopleModule,
		SearchModule,
		DatabaseModule,
		StorageModule,
		AuthModule
	],
	controllers: [FilmsController],
	providers: [FilmsService],
	exports: [FilmsService]
})
export class FilmsModule {}
