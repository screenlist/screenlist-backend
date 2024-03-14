import { Module } from '@nestjs/common';
import { Datastore } from '@google-cloud/datastore'
import { DatabaseService } from './database.service';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [Datastore],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}