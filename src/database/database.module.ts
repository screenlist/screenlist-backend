import { Module } from '@nestjs/common';
import { Datastore } from '@google-cloud/datastore'
import { DatabaseService } from './database.service';

@Module({
  imports: [Datastore],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}