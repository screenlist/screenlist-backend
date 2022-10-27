import { Module } from '@nestjs/common';
import { PeopleService } from './people.service';
import { PeopleController } from './people.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

@Module({
	imports: [AuthModule, DatabaseModule, StorageModule, UsersModule],
	providers: [PeopleService],
	controllers: [PeopleController],
	exports: [PeopleService]
})
export class PeopleModule {}
