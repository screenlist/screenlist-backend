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
import { InsertResult } from 'typeorm';
import { FilmsService } from './films.service'
import { Film, FilmHistory } from './films.entity';

@Controller('films')
export class FilmsController {
	constructor(private filmsService: FilmsService){}

	@Get()
	async findAll(): Promise<Film[] | HttpException> {
		try{
			return this.filmsService.findAll()
		} catch {
			throw new HttpException("Not Found", 404)
		}
	}

	@Post('create')
	async create(@Body() film: Film): Promise<InsertResult | HttpException>{
		try{
			return await this.filmsService.create(film)
		} catch(err: unknown) {
			console.log(err)
			throw new HttpException(err, 404)
		}
	}
}
