import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import { Film } from './films.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Film])],
	controllers: [FilmsController],
	providers: [FilmsService]
})
export class FilmsModule {}
