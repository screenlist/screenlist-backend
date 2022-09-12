import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Still } from './stills.entity';
import { StillsService } from './stills.service';

@Module({
	imports: [TypeOrmModule.forFeature([Still])],
	providers: [StillsService]
})
export class StillsModule {}
