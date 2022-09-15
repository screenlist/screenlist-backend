import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { FilesModule } from './files/files.module';


@Module({
  imports: [
    SeriesModule, 
    FilmsModule, 
    SearchModule, 
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true
      }),
      inject: [ConfigService]
    }),
    PlatformsModule,
    PeopleModule,
    StillsModule,
    CompaniesModule,
    PostersModule,
    FilesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
