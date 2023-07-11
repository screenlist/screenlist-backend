import { Module } from '@nestjs/common';
import { Datastore } from '@google-cloud/datastore'
import { DatabaseService } from './database.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [Datastore, AuthModule],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}