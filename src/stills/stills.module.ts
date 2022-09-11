import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Still } from './stills.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Still])]
})
export class StillsModule {}
