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
import { CreateFilmDto, UpdateFilmDto } from './films.dto';
import { DatabaseService } from '../database/database.service';
import { CompaniesService } from '../companies/companies.service';

@Controller('films')
export class FilmsController {
	constructor(
		private filmsService: FilmsService,
		private companiesService: CompaniesService
	){}

	// Core film methods
	@Get()
	async findMany(){}

	@Get(':id')
	async findOne(){}

	@Post()
	async createOne(){}

	@Patch(':id')
	async updateOne(){}

	@Delete(':id')
	async deleteOne(){}

	// CompanyRole methods
	@Patch([':id', ':company_id', ':role_id'])
	async updateOneCompanyRole(){}

	@Delete([':id', ':company_id', ':role_id'])
	async deleteOneCompanyRole(){}

	// @Get()
	// async findOne() {
	// 	return new Promise<any[]>((resolve, reject) => {
	// 		const query = this.datastore.createQuery('Task');
	// 		this.datastore.runQuery(query, async (err, entities) => {
	// 			// console.log(entities)
	// 			if(err){
	// 				reject(new HttpException(err, 404))
	// 			} else {
	// 				resolve(entities.map(obj => {
	// 					obj.id = obj[this.datastore.KEY]
	// 					console.log(obj.id)
	// 					return obj
	// 				}))
	// 			}
	// 		})
	// 	})
	// }
}