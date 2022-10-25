import { Module } from '@nestjs/common';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { PeopleModule } from '../people/people.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [
		CompaniesModule,
		UsersModule,
		PlatformsModule,
		PeopleModule,
		DatabaseModule,
		StorageModule,
		AuthModule
	],
	controllers: [FilmsController],
	providers: [FilmsService],
	exports: [FilmsService]
})
export class FilmsModule {}
