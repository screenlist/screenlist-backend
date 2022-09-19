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
import { StillsModule } from './stills/stills.module';
import { CompaniesModule } from './companies/companies.module';
import { PostersModule } from './posters/posters.module';
import { DatabaseModule } from './database/database.module';


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
    StillsModule,
    CompaniesModule,
    PostersModule,
    DatabaseModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
