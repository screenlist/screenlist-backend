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
import { FilmsService } from './films.service'
import { Film, FilmHistory } from './films.entity';
import { CreateFilmDto, UpdateFilmDto } from './films.dto';

@Controller('films')
export class FilmsController {
	constructor(private filmsService: FilmsService, private configService: ConfigService){}

	@Get()
	async findOne() {
		const datastore = new Datastore({
			projectId: this.configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../db.json')
		})
		try{
			const taskKey = datastore.key(['Task']);
			console.log(taskKey)
			return await datastore.get(taskKey);
		} catch(err: any) {
			throw new HttpException(err.message, 404)
		}
	}

	@Post()
	async makeSome() {
		const datastore = new Datastore({
			projectId: this.configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../db.json')
		})
		try{
			const taskKey = datastore.key('Task');
			const task = {
			  category: 'Personal',
			  done: false,
			  priority: 4,
			  description: 'Learn Cloud Datastore',
			};

			const entity = {
			  key: taskKey,
			  data: task,
			};

			const result = await datastore.upsert(entity);
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
