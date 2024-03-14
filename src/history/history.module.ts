import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [AuthModule, DatabaseModule, StorageModule],
  providers: [HistoryService],
  exports: [HistoryService]
})
export class HistoryModule {}
  