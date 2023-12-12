import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FilmsModule } from './films/films.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module';
import { PeopleModule } from './people/people.module';
import { StorageModule } from './storage/storage.module';
import { CompaniesModule } from './companies/companies.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { PaymentsModule } from './payments/payments.module';


@Module({
  imports: [
    FilmsModule, 
    SearchModule, 
    UsersModule,
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PeopleModule,
    StorageModule,
    CompaniesModule,
    DatabaseModule,
    AuthModule,
    ContentModule,
    PaymentsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
