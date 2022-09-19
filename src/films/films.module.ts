import { Module } from '@nestjs/common';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { StillsModule } from '../stills/stills.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { PeopleModule } from '../people/people.module';
import { PostersModule } from '../posters/posters.module';
import { DatabaseModule } from '../database/database.module'

@Module({
	imports: [
		CompaniesModule,
		UsersModule,
		StillsModule,
		PlatformsModule,
		PeopleModule,
		PostersModule,
		DatabaseModule
	],
	controllers: [FilmsController],
	providers: [FilmsService]
})
export class FilmsModule {}
