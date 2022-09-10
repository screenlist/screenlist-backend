import { Module } from '@nestjs/common';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import { FilmDraft, Film } from './films.entity';

@Module({
	controllers: [FilmsController],
	providers: [FilmsService]
})
export class FilmsModule {}
