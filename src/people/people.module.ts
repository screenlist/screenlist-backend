import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person, Role } from './people.entity';
import { PeopleService } from './people.service';

@Module({
	imports: [TypeOrmModule.forFeature([Person, Role])],
	providers: [PeopleService],
	exports: [TypeOrmModule]
})
export class PeopleModule {}
