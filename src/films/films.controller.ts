import { 
	Controller, 
	Get,
	Post,
	Put,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	HttpException
} from '@nestjs/common';
import { Datastore } from '@google-cloud/datastore';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { InsertResult } from 'typeorm';
import { FilmsService } from './films.service';
import { Film, FilmHistory } from './films.entity';
import { CreateFilmDto, UpdateFilmDto } from './films.dto';
import { DatabaseService } from '../database/database.service';

@Controller('films')
export class FilmsController {
	constructor(
		private filmsService: FilmsService, 
		private configService: ConfigService,
		private datastore: DatabaseService
	){
		this.datastore = new DatabaseService(configService)
	}

	@Get()
	async findOne() {
		try{
			// const taskKey = datastore.key(['Task', +'5646488461901824']);
			// console.log(taskKey)  
			const query = this.datastore.createQuery('Task');
			const result = await this.datastore.runQuery(query)
			return result[0]
		} catch(err: any) {
			throw new HttpException(err.message, 404)
		}
	}

	@Post()
	async makeSome() {
		try{
			const taskKey = this.datastore.key('Task');
			const task = {
			  category: 'Personal',
			  done: false,
			  priority: 6,
			  description: 'Do Not Learn Cloud Datastore',
			};

			const entity = {
			  key: taskKey,
			  data: task,
			};

			const result = await this.datastore.upsert(entity);
			// Task inserted successfully.
			return {key: taskKey, result}
		} catch(err:any){
			throw new HttpException(err.message, 404)
		}
	}

	@Post('create')
	async create(@Body() film: CreateFilmDto): Promise<void>{
		try{
			await this.filmsService.create(film)
		} catch(err: unknown) {
			console.log(err)
			throw new HttpException(err, 404)
		}
	}
}
