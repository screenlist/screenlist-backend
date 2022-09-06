import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FilmsController } from './films/films.controller';
import { SeriesController } from './series/series.controller';
import { SearchController } from './search/search.controller';
import { ContributorsController } from './contributors/contributors.controller';
import { FilmsService } from './films/films.service';
import { SeriesService } from './series/series.service';
import { ContributorsService } from './contributors/contributors.service';
import { SearchService } from './search/search.service';

@Module({
  imports: [],
  controllers: [AppController, FilmsController, SeriesController, SearchController, ContributorsController],
  providers: [AppService, FilmsService, SeriesService, ContributorsService, SearchService],
})
export class AppModule {}
