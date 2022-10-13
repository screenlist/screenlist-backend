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
	UploadedFile,
	UseInterceptors 
} from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import { FilmsService } from '../films/films.service';
import {
	CreatePosterDto,
	UpdatePosterDto,
	CreateStillDto,
	UpdateStillDto
} from '../films/films.dto';
import { ImageOpt } from '../films/films.types';
import { CompaniesService } from '../companies/companies.service';
import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto
} from '../companies/companies.dto';
import { CompanyRoleOpt } from '../companies/companies.types';
import {
	CreatePersonRoleDto,
	UpdatePersonRoleDto
} from '../people/people.dto';
import { PersonRoleOpt } from '../people/people.types';
import { PeopleService } from '../people/people.service';
import {
	CreateLinkDto,
	UpdateLinkDto
} from '../platforms/platforms.dto';
import { LinkOpt } from '../platforms/platforms.types';
import { PlatformsService } from '../platforms/platforms.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSeriesDto, UpdateSeriesDto } from './series.dto';
import { SeriesService } from './series.service';

@Controller('series')
@UseGuards(RolesGuard)
export class SeriesController {
	constructor(
		private filmsService: FilmsService,
		private companiesService: CompaniesService,
		private authService: AuthService,
		private peopleService: PeopleService,
		private platformsService: PlatformsService,
		private seriesService: SeriesService
	){}

	// Core series methods
	@Get()
	async findAll(){
		return await this.seriesService.findAll()
	}	

	@Post()
	@Roles('member')
	async createOne(
		@Body() createSeriesDto: CreateSeriesDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.seriesService.createOne(createSeriesDto, user)
	}

	@Get(':id')
	async findOne(
		@Param('id') id: string
	){
		return await this.seriesService.findOne(id)
	}

	@Patch(':id')
	@Roles('member')
	async updateOne(
		@Param('id') id: string, 
		@Body() updateSeriesDto: UpdateSeriesDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.seriesService.updateOne(updateSeriesDto, user, id)
	}

	@Delete(':id')
	@Roles('member')
	async deleteOne(
		@Param('id') id: string, 
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.seriesService.deleteOne(id, user);
	}

	// Still methods
	@Post(':seriesId/stills')
	@Roles('member')
	@UseInterceptors(FileInterceptor('still'))
	async uploadStill(
		@Param('seriesId') seriesId: string,
		@UploadedFile() still: Express.Multer.File,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: seriesId,
			parentKind: 'Series'
		}
		return await this.filmsService.uploadStill(imageOptions, still);
	}

	@Patch(':seriesId/stills/stillId')
	@Roles('member')
	async updateStillDescription(
		@Param('seriesId') seriesId: string,
		@Param('stillId') stillId: string,
		@Body() updateStillDto: UpdateStillDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: seriesId,
			parentKind: 'Film',
			imageId: stillId
		}
		return await this.filmsService.updateStill(updateStillDto, imageOptions);
	}

	@Delete(':seriesId/stills/stillId')
	@Roles('member')
	async deleteStill(
		@Param('seriesId') seriesId: string,
		@Param('stillId') stillId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: seriesId,
			parentKind: 'Series',
			imageId: stillId
		}
		return await this.filmsService.deleteStill(imageOptions);
	}

	// Poster methods
	@Post(':seriesId/posters')
	@Roles('member')
	@UseInterceptors(FileInterceptor('poster'))
	async uploadPoster(
		@Param('seriesId') seriesId: string,
		@UploadedFile() poster: Express.Multer.File,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: seriesId,
			parentKind: 'Series'
		}
		return await this.filmsService.uploadPoster(imageOptions, poster);
	}

	@Patch(':seriesId/posters/posterId')
	@Roles('member')
	async updatePosterDescription(
		@Param('seriesId') seriesId: string,
		@Param('posterId') posterId: string,
		@Body() updatePosterDto: UpdatePosterDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: seriesId,
			parentKind: 'Series',
			imageId: posterId
		}
		return await this.filmsService.updatePoster(updatePosterDto, imageOptions);
	}

	@Delete(':seriesId/posters/posterId')
	@Roles('member')
	async deletePoster(
		@Param('seriesId') seriesId: string,
		@Param('posterId') posterId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: seriesId,
			parentKind: 'Series',
			imageId: posterId
		}
		return await this.filmsService.deletePoster(imageOptions);
	}

	// CompanyRole methods
	@Post(':seriesId/companies/:companyId/roles')
	@Roles('member')
	async createOneCompanyRole(
		@Param('seriesId') seriesId: string,
		@Param('companyId') companyId: string,
		@Body() createCompanyRoleDto: CreateCompanyRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: companyId,
			parentId: seriesId,
			parentKind: 'Series'
		}
		return await this.companiesService.createOneRole(createCompanyRoleDto, roleOptions);
	}

	@Patch(':seriesId/companies/:companyId/roles/:roleId')
	@Roles('member')
	async updateOneCompanyRole(
		@Param('seriesId') seriesId: string,
		@Param('companyId') companyId: string,
		@Param('roleId') roleId: string,
		@Body() updateCompanyRoleDto: UpdateCompanyRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: companyId,
			parentId: seriesId,
			roleId: roleId,
			parentKind: 'Series'
		}
		return await this.companiesService.updateOneRole(updateCompanyRoleDto, roleOptions);
	}

	@Delete(':seriesId/companies/:companyId/roles/:roleId')
	@Roles('member')
	async deleteOneCompanyRole(
		@Param('seriesId') seriesId: string,
		@Param('companyId') companyId: string,
		@Param('roleId') roleId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: companyId,
			parentId: seriesId,
			roleId: roleId,
			parentKind: 'Series'
		}
		return await this.companiesService.deleteOneRole(roleOptions);
	}

	// PersonRole methods
	@Post(':seriesId/people/:personId/roles')
	@Roles('member')
	async createOnePersonRole(
		@Param('seriesId') seriesId: string,
		@Param('personId') personId: string,
		@Body() createPersonRoleDto: CreatePersonRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: PersonRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: personId,
			parentId: seriesId,
			parentKind: 'Series'
		}
		return await this.peopleService.createOneRole(createPersonRoleDto, roleOptions);
	}

	@Patch(':seriesId/people/:personId/roles/:roleId')
	@Roles('member')
	async updateOnePersonRole(
		@Param('seriesId') seriesId: string,
		@Param('personId') personId: string,
		@Param('roleId') roleId: string,
		@Body() updatePersonRoleDto: UpdatePersonRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: PersonRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: personId,
			parentId: seriesId,
			roleId: roleId,
			parentKind: 'Series'
		}
		return await this.peopleService.updateOneRole(updatePersonRoleDto, roleOptions);
	}

	@Delete(':seriesId/people/:personId/roles/:roleId')
	@Roles('member')
	async deleteOnePersonRole(
		@Param('seriesId') seriesId: string,
		@Param('personId') personId: string,
		@Param('roleId') roleId: string, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: PersonRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: personId,
			parentId: seriesId,
			roleId: roleId,
			parentKind: 'Series'
		}
		return await this.peopleService.deleteOneRole(roleOptions);
	}

	// Link methods
	@Post(':seriesId/platforms/:platformId/links')
	@Roles('member')
	async createOneLink(
		@Param('seriesId') seriesId: string,
		@Param('platformId') platformId: string,
		@Body() createLinkDto: CreateLinkDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: LinkOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: platformId,
			parentId: seriesId,
			parentKind: 'Series'
		}
		return await this.platformsService.createOneLink(createLinkDto, roleOptions);
	}

	@Patch(':seriesId/platforms/:platformId/links/:linkId')
	@Roles('member')
	async updateOneLink(
		@Param('seriesId') seriesId: string,
		@Param('platformId') platformId: string,
		@Param('linkId') linkId: string,
		@Body() updateLinkDto: UpdateLinkDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: LinkOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: platformId,
			parentId: seriesId,
			linkId: linkId,
			parentKind: 'Series'
		}
		return await this.platformsService.updateOneLink(updateLinkDto, roleOptions);
	}

	@Delete(':seriesId/platforms/:platformId/links/:linkId')
	@Roles('member')
	async deleteOneLink(
		@Param('seriesId') seriesId: string,
		@Param('platformId') platformId: string,
		@Param('linkId') linkId: string, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: LinkOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: platformId,
			parentId: seriesId,
			linkId: linkId,
			parentKind: 'Series'
		}
		return await this.platformsService.deleteOneLink(roleOptions);
	}
}
