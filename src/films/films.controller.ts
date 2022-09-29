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
import { 
	FilmDetails, 
	Poster, 
	Still, 
	PersonRole, 
	Person,
	Link,
	Platform,
	FilmType
} from './films.types';
import { DatabaseService } from '../database/database.service';
import { CompaniesService } from '../companies/companies.service';
import { UpdateCompanyRoleDto } from '../companies/companies.dto';

@Controller('films')
export class FilmsController {
	constructor(
		private filmsService: FilmsService,
		private companiesService: CompaniesService
	){}

	// Core film methods
	@Get()
	async findMany(): Promise<FilmType[]>{
		return await this.filmsService.findAll()
	}

	@Get(':id')
	async findOne(@Param('id') id: string): Promise<FilmType>{
		return await this.filmsService.findOne(id)
	}

	@Post(':id')
	async createOne(@Param('id') id: string, @Body() createFilmDto: CreateFilmDto, user: string){
		return await this.filmsService.createOne(createFilmDto, user)
	}

	@Patch(':id')
	async updateOne(@Param('id') id: string, @Body() updateFilmDto: UpdateFilmDto, user: string){
		return await this.filmsService.updateOne(updateFilmDto, user)
	}

	@Delete(':id')
	async deleteOne(@Param('id') id: string, user: string){
		return await this.filmsService.deleteOne(id, user);
	}

	// CompanyRole methods
	@Patch(':id/company')
	async updateOneCompanyRole(
		@Param('id') id: string,
		@Query('company_id') companyId: string,
		@Query('role_id') roleId: string,
		@Body() updateCompanyRoleDto: UpdateCompanyRoleDto, 
		user: string
	){
		return await this.companiesService.updateOneRole(updateCompanyRoleDto, 'Film', id, user);
	}

	@Delete(':id/company')
	async deleteOneCompanyRole(
		@Param('id') id: string,
		@Query('company_id') companyId: string,
		@Query('role_id') roleId: string,
		@Body() updateCompanyRoleDto: UpdateCompanyRoleDto, 
		user: string
	){
		return await this.companiesService.deleteOneRole(roleId,'Film', id, user, companyId);
	}

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