import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module'
import { SearchModule } from 'src/search/search.module';

@Module({
  imports: [DatabaseModule, StorageModule, AuthModule, UsersModule, SearchModule],
  providers: [ContentService],
  controllers: [ContentController]
})
export class ContentModule {}
