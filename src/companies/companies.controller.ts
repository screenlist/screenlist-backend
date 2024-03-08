import { 
	Controller, 
	UseGuards,
	Get,
	Post,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	Headers,
	UseInterceptors,
	UploadedFile
} from '@nestjs/common';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { FrequencyGuard } from '../database/frequency.guard';
import { Frequency } from '../database/frequency.decorator';
import { CompaniesService } from './companies.service';
import {
	CreateCompanyDto,
	UpdateCompanyDto
} from './companies.dto';
import {
	Company,
	CompanyOpt
} from './companies.types';
import { CollectionFields } from '../database/database.types';
import { ImageOpt } from '../films/films.types';
import { PhotoDto } from '../films/films.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { EditGuard } from 'src/films/films.edit.guard';
import { EditLock } from 'src/films/films.edit.decorator';

@Controller('companies')
@UseGuards(RolesGuard)
export class CompaniesController {
	constructor(
		private companiesService: CompaniesService
	){}

	@Get()
	async findAll(
		@Query('page') page: number,
		@Query('limit') limit: number
	){
		return await this.companiesService.findAll(page, limit);
	}	

	@Post()
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('companies')
	async createOne(
		@Body() createCompanyDto: CreateCompanyDto,
		@Headers('x-user-id') userId: string
	){
		const companyOptions: CompanyOpt = {
			user: userId,
			time: new Date(),
		}
		return await this.companiesService.createOne(createCompanyDto, companyOptions);
	}

	@Get(':id')
	@UseGuards(FrequencyGuard)
	@Frequency('companies')
	async findOne(@Param('id') id: string){
		return await this.companiesService.findOne(id);
	}

	@Patch(':id')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('companies')
	async updateOne(
		@Param('id') id: string,
		@Body('update') updateCompanyDto: UpdateCompanyDto,
		@Body('remove') toRemove: CollectionFields<Company>,
		@Headers('x-user-id') userId: string
	){
		const companyOptions: CompanyOpt = {
			user: userId,
			time: new Date(),
			companyId: id
		}

		return await this.companiesService.updateOne(updateCompanyDto, companyOptions, toRemove);
	}

	@Delete(':id')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('companies')
	async deleteOne(
		@Param('id') id: string,
		@Headers('x-user-id') userId: string
	){
		const companyOptions: CompanyOpt = {
			user: userId,
			time: new Date(),
			companyId: id
		}
		return await this.companiesService.deleteOne(companyOptions);
	}

	@Get(':id/history')
	async findHistory(
		@Param('id') companyId: string,
	){
		return await this.companiesService.findHistory(companyId);
	}

	// Settings routes
	@Patch(':id/settings/verify')
	@Roles('moderator')
	async verifyEdit(
		@Param('id') id: string
	){
		return await this.companiesService.verifyEdit(id);
	}

	@Patch(':id/settings/hide')
	@Roles('moderator')
	async hideFilm(
		@Param('id') id: string
	){
		return await this.companiesService.hideFilm(id);
	}

	@Patch(':id/settings/unhide')
	@Roles('moderator')
	async unhideFilm(
		@Param('id') id: string
	){
		return await this.companiesService.unhideFilm(id);
	}

	@Patch(':id/settings/lock')
	@Roles('moderator')
	async lockFilmEdit(
		@Param('id') id: string
	){
		return await this.companiesService.lockFilmEdit(id);
	}

	@Patch(':id/settings/unlock')
	@Roles('moderator')
	async unlockFilmEdit(
		@Param('id') id: string
	){
		return await this.companiesService.unlockFilmEdit(id);
	}

	// Photos routes
	@Post(':id/photo')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('companies')
	@UseInterceptors(FileInterceptor('profile'))
	async uploadPhoto(
		@Param('id') id: string,
		@Query('index') index: number,
		@Headers('x-user-id') userId: string,
		@UploadedFile() profile: Express.Multer.File
	){
		const imageOptions: ImageOpt = {
			user: userId,
			time: new Date(),
			parentId: id,
			parentKind: 'companies',
			index: index
		}
		return await this.companiesService.uploadPhoto(imageOptions, profile);
	}

	@Patch(':id/photo')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('companies')
	async updatePhoto(
		@Param('id') id: string,
		@Query('index') index: number,
		@Body() updatePhoto : PhotoDto,
		@Headers('x-user-id') userId: string,
	){
		const imageOptions: ImageOpt = {
			user: userId,
			time: new Date(),
			parentId: id,
			parentKind: 'companies',
			index: index
		}
		return await this.companiesService.updatePhoto(updatePhoto, imageOptions);
	}

	@Delete(':id/photo')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('companies')
	async removePhoto(
		@Param('id') id: string,
		@Query('index') index: number,
		@Headers('x-user-id') userId: string
	){
		const imageOptions: ImageOpt = {
			user: userId,
			time: new Date(),
			parentId: id,
			parentKind: 'companies',
			index: index
		}
		return await this.companiesService.removePhoto(imageOptions)
	}

	@Get('data/unmoderated')
	@Roles('moderator')
	async getUnmoderated(){
		return await this.companiesService.findAllUnverified()
	}
}
