import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { FilmsModule } from '../films/films.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuthModule, DatabaseModule, FilmsModule, StorageModule],
  providers: [UsersService],
  controllers: [UsersController]
})
export class UsersModule {}
