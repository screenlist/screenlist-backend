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

	@Post(':id/photo')
	@Roles('member')
	@UseInterceptors(FileInterceptor('profile'))
	async uploadPhoto(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string,
		@UploadedFile() profile: Express.Multer.File
	){
		const companyOptions: CompanyOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: id
		}
		return await this.companiesService.uploadPhoto(companyOptions, profile);
	}

	@Delete(':id/photo')
	@Roles('member')
	async removePhoto(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const companyOptions: CompanyOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: id
		}
		return await this.companiesService.removePhoto(companyOptions)
	}
}
