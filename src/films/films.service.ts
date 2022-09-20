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
		const results: GetFilmDto[] = []
		try {
			const films = await this.datastore.runQuery(query)
			films[0].forEach(async (film: FilmDetails) => {
				const posterQuery = this.datastore.createQuery('Poster').filter('film', '=', film.name).limit(2);
				const posters = await this.datastore.runQuery(posterQuery);
				const wholeFilm: GetFilmDto = {
					details: film,
					posters: posters[0] as GetFilmDto["posters"]
				}
				results.push(wholeFilm)
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