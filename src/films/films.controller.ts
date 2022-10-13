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
import { FilmsService } from './films.service';
import {
	CreatePosterDto,
	UpdatePosterDto,
	CreateStillDto,
	UpdateStillDto,
	CreateFilmDto, 
	UpdateFilmDto 
} from './films.dto';
import { 
	Film, 
	Poster, 
	Still,
	FilmType,
	ImageOpt
} from './films.types';
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

@Controller('films')
@UseGuards(RolesGuard)
export class FilmsController {
	constructor(
		private filmsService: FilmsService,
		private companiesService: CompaniesService,
		private authService: AuthService,
		private peopleService: PeopleService,
		private platformsService: PlatformsService,
	){}

	// Core film methods
	@Get()
	async findAll(){
		return await this.filmsService.findAll()
	}	

	@Post()
	@Roles('member')
	async createOne(
		@Body() createFilmDto: CreateFilmDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.createOne(createFilmDto, user)
	}

	@Get(':id')
	async findOne(
		@Param('id') id: string
	){
		return await this.filmsService.findOne(id)
	}

	@Patch(':id')
	@Roles('member')
	async updateOne(
		@Param('id') id: string, 
		@Body() updateFilmDto: UpdateFilmDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.updateOne(updateFilmDto, user, id)
	}

	@Delete(':id')
	@Roles('member')
	async deleteOne(
		@Param('id') id: string, 
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.deleteOne(id, user);
	}

	// Still methods
	@Post(':filmId/stills')
	@Roles('member')
	@UseInterceptors(FileInterceptor('still'))
	async uploadStill(
		@Param('filmId') filmId: string,
		@UploadedFile() still: Express.Multer.File,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film'
		}
		return await this.filmsService.uploadStill(imageOptions, still);
	}

	@Patch(':filmId/stills/stillId')
	@Roles('member')
	async updateStillDescription(
		@Param('filmId') filmId: string,
		@Param('stillId') stillId: string,
		@Body() updateStillDto: UpdateStillDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: stillId
		}
		return await this.filmsService.updateStill(updateStillDto, imageOptions);
	}

	@Delete(':filmId/stills/stillId')
	@Roles('member')
	async deleteStill(
		@Param('filmId') filmId: string,
		@Param('stillId') stillId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: stillId
		}
		return await this.filmsService.deleteStill(imageOptions);
	}

	// Poster methods
	@Post(':filmId/posters')
	@Roles('member')
	@UseInterceptors(FileInterceptor('poster'))
	async uploadPoster(
		@Param('filmId') filmId: string,
		@UploadedFile() poster: Express.Multer.File,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film'
		}
		return await this.filmsService.uploadPoster(imageOptions, poster);
	}

	@Patch(':filmId/posters/posterId')
	@Roles('member')
	async updatePosterDescription(
		@Param('filmId') filmId: string,
		@Param('posterId') posterId: string,
		@Body() updatePosterDto: UpdatePosterDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: posterId
		}
		return await this.filmsService.updatePoster(updatePosterDto, imageOptions);
	}

	@Delete(':filmId/posters/posterId')
	@Roles('member')
	async deletePoster(
		@Param('filmId') filmId: string,
		@Param('posterId') posterId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: posterId
		}
		return await this.filmsService.deletePoster(imageOptions);
	}

	// CompanyRole methods
	@Post(':filmId/companies/:companyId/roles')
	@Roles('member')
	async createOneCompanyRole(
		@Param('filmId') filmId: string,
		@Param('companyId') companyId: string,
		@Body() createCompanyRoleDto: CreateCompanyRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: companyId,
			parentId: filmId,
			parentKind: 'Film'
		}
		return await this.companiesService.createOneRole(createCompanyRoleDto, roleOptions);
	}

	@Patch(':filmId/companies/:companyId/roles/:roleId')
	@Roles('member')
	async updateOneCompanyRole(
		@Param('filmId') filmId: string,
		@Param('companyId') companyId: string,
		@Param('roleId') roleId: string,
		@Body() updateCompanyRoleDto: UpdateCompanyRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: companyId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'Film'
		}
		return await this.companiesService.updateOneRole(updateCompanyRoleDto, roleOptions);
	}

	@Delete(':filmId/companies/:companyId/roles/:roleId')
	@Roles('member')
	async deleteOneCompanyRole(
		@Param('filmId') filmId: string,
		@Param('companyId') companyId: string,
		@Param('roleId') roleId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			companyId: companyId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'Film'
		}
		return await this.companiesService.deleteOneRole(roleOptions);
	}

	// PersonRole methods
	@Post(':filmId/people/:personId/roles')
	@Roles('member')
	async createOnePersonRole(
		@Param('filmId') filmId: string,
		@Param('personId') personId: string,
		@Body() createPersonRoleDto: CreatePersonRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: PersonRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: personId,
			parentId: filmId,
			parentKind: 'Film'
		}
		return await this.peopleService.createOneRole(createPersonRoleDto, roleOptions);
	}

	@Patch(':filmId/people/:personId/roles/:roleId')
	@Roles('member')
	async updateOnePersonRole(
		@Param('filmId') filmId: string,
		@Param('personId') personId: string,
		@Param('roleId') roleId: string,
		@Body() updatePersonRoleDto: UpdatePersonRoleDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: PersonRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: personId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'Film'
		}
		return await this.peopleService.updateOneRole(updatePersonRoleDto, roleOptions);
	}

	@Delete(':filmId/people/:personId/roles/:roleId')
	@Roles('member')
	async deleteOnePersonRole(
		@Param('filmId') filmId: string,
		@Param('personId') personId: string,
		@Param('roleId') roleId: string, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: PersonRoleOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: personId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'Film'
		}
		return await this.peopleService.deleteOneRole(roleOptions);
	}

	// Link methods
	@Post(':filmId/platforms/:platformId/links')
	@Roles('member')
	async createOneLink(
		@Param('filmId') filmId: string,
		@Param('platformId') platformId: string,
		@Body() createLinkDto: CreateLinkDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: LinkOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: platformId,
			parentId: filmId,
			parentKind: 'Film'
		}
		return await this.platformsService.createOneLink(createLinkDto, roleOptions);
	}

	@Patch(':filmId/platforms/:platformId/links/:linkId')
	@Roles('member')
	async updateOneLink(
		@Param('filmId') filmId: string,
		@Param('platformId') platformId: string,
		@Param('linkId') linkId: string,
		@Body() updateLinkDto: UpdateLinkDto, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: LinkOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: platformId,
			parentId: filmId,
			linkId: linkId,
			parentKind: 'Film'
		}
		return await this.platformsService.updateOneLink(updateLinkDto, roleOptions);
	}

	@Delete(':filmId/platforms/:platformId/links/:linkId')
	@Roles('member')
	async deleteOneLink(
		@Param('filmId') filmId: string,
		@Param('platformId') platformId: string,
		@Param('linkId') linkId: string, 
		@Headers('AuthorizationToken') idToken: string
	){
		const roleOptions: LinkOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: platformId,
			parentId: filmId,
			linkId: linkId,
			parentKind: 'Film'
		}
		return await this.platformsService.deleteOneLink(roleOptions);
	}
}