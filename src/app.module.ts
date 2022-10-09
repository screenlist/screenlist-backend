import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeriesModule } from './series/series.module';
import { FilmsModule } from './films/films.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module';
import { PlatformsModule } from './platforms/platforms.module';
import { PeopleModule } from './people/people.module';
import { StorageModule } from './storage/storage.module';
import { CompaniesModule } from './companies/companies.module';
import { DatabaseModule } from './database/database.module';
import { SessionModule } from './session/session.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [
    SeriesModule, 
    FilmsModule, 
    SearchModule, 
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PlatformsModule,
    PeopleModule,
    StorageModule,
    CompaniesModule,
    DatabaseModule,
    SessionModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
