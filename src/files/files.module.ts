import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { StillsModule } from '../stills/stills.module';
import { PostersModule } from '../posters/posters.module';

@Module({
  imports: [StillsModule, PostersModule],
  providers: [FilesService],
  controllers: [FilesController]
})
export class FilesModule {}
