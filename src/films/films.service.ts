import { Injectable, ParseFileOptions, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, InsertResult } from 'typeorm';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { CreateFilmDto, UpdateFilmDto, GetFilmDto } from './films.dto';
import { 
	FilmDetails, 
	Company, 
	Poster, 
	Still, 
	Role, 
	Person 
} from './films.types'


@Injectable()
export class FilmsService {
	constructor(
		private configService: ConfigService,
		private datastore: DatabaseService
	){
		this.datastore = new DatabaseService(configService)
	}

	async findAll(): Promise<GetFilmDto[]>{
		const query = this.datastore.createQuery('Film').limit(20)
		try {
			const films = await this.datastore.runQuery(query)
			const results: Promise<GetFilmDto[]> = films[0].map(async (film: FilmDetails) => {
				const posterQuery = this.datastore.createQuery('Poster').filter('film', '=', film.name).limit(2);
				const productionQuery = this.datastore.createQuery('Production').filter('film', '=', film.name).limit(5);
				const productionCompanies = await this.datastore.runQuery(productionQuery);
				const posters = await this.datastore.runQuery(posterQuery);
				const wholeFilm: GetFilmDto = {
					details: film,
					posters: posters[0] as GetFilmDto.posters[]
				}
				return wholeFilm
			})
			return results
		} catch {
			throw new BadRequestException("Not FOund")
		}
	}

	async findOne(id: number) {
	}

	async create(film: CreateFilmDto): Promise<void> {
	}
}