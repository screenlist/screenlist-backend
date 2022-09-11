import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person, Role } from './people.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Person, Role])]
})
export class PeopleModule {}
