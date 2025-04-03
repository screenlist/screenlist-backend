import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [AuthModule],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}