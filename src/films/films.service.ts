import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, InsertResult } from 'typeorm';
import { Film, FilmHistory } from './films.entity';

@Injectable()
export class FilmsService {
	constructor(
		@InjectRepository(Film)
		private filmRepository: Repository<Film>,

		@InjectRepository(FilmHistory)
		private filmHistoryRepository: Repository<FilmHistory>
	){}

	async findAll(): Promise<Film[]> {
		return await this.filmRepository.find()
	}

	async findOne(id: number): Promise<Film> {
		return await this.filmRepository.findOneBy({id})
	}

	async create(film: Film[]): Promise<InsertResult> {
		return await this.filmRepository.createQueryBuilder('film')
						.insert()
						.into(Film)
						.values(film)
						.execute()
	}
}