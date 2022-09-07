import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeriesModule } from './series/series.module';
import { FilmsModule } from './films/films.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [SeriesModule, FilmsModule, SearchModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
