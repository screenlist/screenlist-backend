import { Module } from '@nestjs/common';
import { Person, Role } from './people.entity';
import { PeopleService } from './people.service';

@Module({
	providers: [PeopleService],
})
export class PeopleModule {}
