import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DatabaseModule } from 'src/database/database.module';
@Module({
  imports: [],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
