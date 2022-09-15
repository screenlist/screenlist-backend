import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Still } from './stills.entity';
import { StillsService } from './stills.service';
import { StillsController } from './stills.controller';
import { PostersModule } from '../posters/posters.module';

@Module({
	imports: [TypeOrmModule.forFeature([Still]), PostersModule],
	providers: [StillsService],
	exports: [TypeOrmModule],
	controllers: [StillsController]
})
export class StillsModule {}
