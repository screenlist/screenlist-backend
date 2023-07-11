import { 
	Controller, 
	UseGuards,
	Get,
	Post,
	Put,
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
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto,
	CreateCompanyDto,
	UpdateCompanyDto
} from './companies.dto';
import {
	Company,
	CompanyRole,
	CompanyType,
	CompanyOpt,
	CompanyRoleOpt
} from './companies.types';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import { ImageOpt } from '../films/films.types';
import { CreateDisplayPhotoDto, UpdateDisplayPhotoDto } from '../films/films.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('companies')
@UseGuards(RolesGuard)
export class CompaniesController {
	constructor(
		private companiesService: CompaniesService,
		private authService: AuthService
	){}

	@Get()
	async findAll(){
		return await this.companiesService.findAll();
	}	

	@Post()
	@Roles('member')
	async createOne(
		@Body() createCompanyDto: CreateCompanyDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const companyOptions: CompanyOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
		}
		return await this.companiesService.createOne(createCompanyDto, companyOptions);
	}

	@Get(':id')
	@UseGuards(FrequencyGuard)
	@Frequency('Company')
	async findOne(@Param('id') id: string){
		return await this.companiesService.findOne(id);
	}

	@Patch(':id')
	@Roles('member')
	async updateOne(
		@Param('id') id: string,
		@Body() updateCompanyDto: UpdateCompanyDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const companyOptions: CompanyOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: id
		}
		return await this.companiesService.updateOne(updateCompanyDto, companyOptions);
	}

	@Delete(':id')
	@Roles('member')
	async deleteOne(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const companyOptions: CompanyOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: id
		}
		return await this.companiesService.deleteOne(companyOptions);
	}

	@Get(':id/history')
	async findHistory(
		@Param('id') companyId: string,
		@Headers('x-page-cursor') cursor: string
	){
		return await this.companiesService.findHistory(companyId);
	}

	@Patch(':id/settings/verify')
	@Roles('moderator')
	async verifyEdit(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const companyOptions: CompanyOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: id
		}
		return await this.companiesService.verifyEdit(companyOptions.user, id);
	}

	@Post(':id/photo')
	@Roles('member')
	@UseInterceptors(FileInterceptor('profile'))
	async uploadPhoto(
		@Param('id') id: string,
		@Query('index') index: string,
		@Headers('AuthorizationToken') idToken: string,
		@UploadedFile() profile: Express.Multer.File
	){
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: id,
			parentKind: 'Company',
			imageId: index
		}
		return await this.companiesService.uploadPhoto(imageOptions, profile);
	}

	@Patch(':id/photo')
	@Roles('member')
	async updatePhoto(
		@Param('id') id: string,
		@Query('index') index: string,
		@Body() updatePhoto : UpdateDisplayPhotoDto,
		@Headers('AuthorizationToken') idToken: string,
	){
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: id,
			parentKind: 'Company',
			imageId: index
		}
		return await this.companiesService.updatePhoto(updatePhoto, imageOptions);
	}

	@Delete(':id/photo')
	@Roles('member')
	async removePhoto(
		@Param('id') id: string,
		@Query('index') index: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: id,
			parentKind: 'Company',
			imageId: index
		}
		return await this.companiesService.removePhoto(imageOptions)
	}

	@Get('data/unmoderated')
	@Roles('moderator')
	async getUnmoderated(){
		return await this.companiesService.findAllUnverified()
	}
}
