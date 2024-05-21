import { Controller, Get, Post, UseGuards, Body, Query, StreamableFile, Res, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard } from './users/roles.guard';
import { Roles } from './users/roles.decorator';
import type { Response } from 'express';
import { SearchService } from './search/search.service';

@Controller()
@UseGuards(RolesGuard)
export class AppController {
	constructor(private readonly appService: AppService, private search: SearchService) {}

	@Get()
	getHello(): string {
		return this.appService.getHello();
	}

	@Post('refresh')
	@Roles('member')
	async refreshClient(@Body('path') path: string){
		return await this.appService.refreshClient(path);
	}

	@Post('extract')
	@Roles('member')
	async getBlob(
		@Query('path') path: string,
		@Res({ passthrough: true}) res: Response
	){
		try{
			const values = await this.appService.getImage(path);
			res.set({'Content-Type': values.type});
			return new StreamableFile(values.uint8)
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}

	@Post('searching/create')
	@Roles('admin')
	async create(){
		return await this.search.createCollections()
	}

	@Post('searching/index')
	@Roles('admin')
	async index(){
		return await this.search.indexAll()
	}

	@Post('searching/delete')
	@Roles('admin')
	async delete(){
		return await this.search.deleteAllCollections()
	}
}
