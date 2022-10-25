import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [ContentService],
  controllers: [ContentController]
})
export class ContentModule {}
