import { Module } from '@nestjs/common';
import { Still } from './stills.entity';
import { StillsService } from './stills.service';
import { StillsController } from './stills.controller';
import { PostersModule } from '../posters/posters.module';

@Module({
	imports: [PostersModule],
	providers: [StillsService],
	controllers: [StillsController]
})
export class StillsModule {}
