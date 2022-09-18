import { Injectable, ParseFileOptions, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, InsertResult } from 'typeorm';
import { Datastore } from '@google-cloud/datastore'
import { CreateFilmDto, UpdateFilmDto } from './films.dto';
import { Film, FilmHistory } from './films.entity';
import { Company } from '../companies/companies.entity';
import { Person, Role } from '../people/people.entity';
import { Platform, WatchLink } from '../platforms/platforms.entity';
import { Still } from '../stills/stills.entity';
import { User } from '../users/users.entity';
import { Poster } from '../posters/posters.entity';

@Injectable()
export class FilmsService {
	constructor(
		
	){}

	async findAll() {
	}

	async findOne(id: number) {
	}

	async create(film: CreateFilmDto): Promise<void> {
	}
}