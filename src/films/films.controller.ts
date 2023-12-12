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
import { RolesGuard } from '../users/roles.guard';
import { FilmsEditGuard } from './films.edit.guard';
import { FrequencyGuard } from '../database/frequency.guard';
import { Roles } from '../users/roles.decorator';
import { EditLock } from './films.edit.decorator';
import { Frequency } from '../database/frequency.decorator';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import { FilmsService } from './films.service';
import {
	CreatePosterDto,
	UpdatePosterDto,
	CreateStillDto,
	UpdateStillDto,
	CreateFilmDto, 
	UpdateFilmDto,
	CreateListRatingDto, 
	UpdateListRatingDto
} from './films.dto';
import { 
	Film, 
	Poster, 
	Still,
	FilmType,
	ImageOpt,
	RatingOpt
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
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('films')
@UseGuards(RolesGuard)
export class FilmsController {
	constructor(
		private filmsService: FilmsService,
		private companiesService: CompaniesService,
		private authService: AuthService,
		private peopleService: PeopleService
	){}

	// Data methods
	@Get('data/film-of-the-day')
	@Roles('admin')
	async getFilmOfTheDay(){
		return await this.filmsService.getFilmOfTheDay();
	}

	@Get('data/latest')
	async getLatestFilms(@Query('limit') size: number){
		return await this.filmsService.getLatestReleases(size)
	}

	@Get('data/trending')
	async getTrendingFilms(@Query('limit') size: number){
		return await this.filmsService.getTrendingFilms(size)
	}

	@Get('data/recently-added')
	async getRecentlyAdded(@Query('limit') size: number){
		return await this.filmsService.getRecentlyAdded(size)
	}

	@Get('data/upcoming')
	async getUpcoming(@Query('limit') size: number){
		return await this.filmsService.getUpcoming(size)
	}

	@Get('data/awaiting-moderation')
	@Roles('moderator')
	async getUnmoderated(){
		return await this.filmsService.findAllUnverified()
	}

	@Get('data/unmoderated-reviews')
	@Roles('moderator')
	async getUnmoderatedReviews(){
		return await this.filmsService.findUnverifiedRatings()
	}

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
	@UseGuards(FrequencyGuard)
	@Frequency('Film')
	async findOne(
		@Param('id') id: string,
		@Query('minimal') style: boolean
	){
		if(style === true){
			return await this.filmsService.findOneDetailsOnly(id)
		} else {
			return await this.filmsService.findOne(id)
		}
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

	@Get(':id/history')
	async findHistory(
		@Param('id') filmId: string,
		@Headers('x-page-cursor') cursor: string
	){
		return await this.filmsService.findHistory(filmId);
	}

	// Settings
	@Patch(':id/settings/hide')
	@Roles('moderator')
	async hideFilm(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.hideFilm(user, id);
	}

	@Patch(':id/settings/unhide')
	@Roles('moderator')
	async unhideFilm(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.unhideFilm(user, id);
	}

	@Patch(':id/settings/verify')
	@Roles('moderator')
	async verifyFilmEdit(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.verifyFilmEdit(user, id);
	}

	@Patch(':id/settings/lock')
	@Roles('moderator')
	async lockFilmEdit(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.lockFilmEdit(user, id);
	}

	@Patch(':id/settings/unlock')
	@Roles('moderator')
	async unlockFilmEdit(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.filmsService.unlockFilmEdit(user, id);
	}

	// Ratings methods
	@Post(':filmId/reviews')
	@Roles('journalist')
	async createReview(
		@Param('filmId') filmId: string,
		@Headers('AuthorizationToken') idToken: string,
		@Body() createListRatingDto: CreateListRatingDto
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film'
		}
		return await this.filmsService.createOneRating(createListRatingDto, imageOptions);
	}

	@Patch(':filmId/reviews/:reviewId')
	@Roles('journalist')
	async updateReview(
		@Param('filmId') filmId: string,
		@Param('reviewId') reviewId: string,
		@Headers('AuthorizationToken') idToken: string,
		@Body() updateListRatingDto: UpdateListRatingDto
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			ratingId: reviewId
		}
		return await this.filmsService.updateOneRating(updateListRatingDto, imageOptions);
	}

	@Delete(':filmId/reviews/:reviewId')
	@Roles('journalist')
	async deleteReview(
		@Param('filmId') filmId: string,
		@Param('reviewId') reviewId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			ratingId: reviewId
		}
		return await this.filmsService.deleteOneRating(imageOptions);
	}

	@Patch(':filmId/reviews/:reviewId/verify')
	@Roles('moderator')
	async verifyReview(
		@Param('filmId') filmId: string,
		@Param('reviewId') reviewId: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			ratingId: reviewId
		}
		return await this.filmsService.verifyRating(imageOptions);
	}

	// Still methods
	@Post(':filmId/stills')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
	@Roles('member')
	@UseInterceptors(FileInterceptor('still'))
	async uploadStill(
		@Param('filmId') filmId: string,
		@UploadedFile() still: Express.Multer.File,
		@Headers('AuthorizationToken') idToken: string,
		@Query('index') index: '0'|'1'|'2'
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: index
		}
		return await this.filmsService.uploadStill(imageOptions, still);
	}

	@Patch(':filmId/stills')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
	@Roles('member')
	async updateStillDescription(
		@Param('filmId') filmId: string,
		@Body() updateStillDto: UpdateStillDto,
		@Headers('AuthorizationToken') idToken: string,
		@Query('index') index: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: index
		}
		return await this.filmsService.updateStill(updateStillDto, imageOptions);
	}

	@Delete(':filmId/stills')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
	@Roles('member')
	async deleteStill(
		@Param('filmId') filmId: string,
		@Headers('AuthorizationToken') idToken: string,
		@Query('index') index: string
	){
		console.log("deletes still")
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: index
		}
		return await this.filmsService.deleteStill(imageOptions);
	}

	// Poster methods
	@Post(':filmId/posters')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
	@Roles('member')
	@UseInterceptors(FileInterceptor('poster'))
	async uploadPoster(
		@Param('filmId') filmId: string,
		@UploadedFile() poster: Express.Multer.File,
		@Headers('AuthorizationToken') idToken: string,
		@Query('index') index: '0'
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: index
		}
		console.log(poster)
		return await this.filmsService.uploadPoster(imageOptions, poster);
	}

	@Patch(':filmId/posters')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
	@Roles('member')
	async updatePosterDescription(
		@Param('filmId') filmId: string,
		@Body() updatePosterDto: UpdatePosterDto,
		@Headers('AuthorizationToken') idToken: string,
		@Query('index') index: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: index
		}
		return await this.filmsService.updatePoster(updatePosterDto, imageOptions);
	}

	@Delete(':filmId/posters')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
	@Roles('member')
	async deletePoster(
		@Param('filmId') filmId: string,
		@Headers('AuthorizationToken') idToken: string,
		@Query('index') index: string
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: await this.authService.getUserUid(idToken),
			parentId: filmId,
			parentKind: 'Film',
			imageId: index
		}
		return await this.filmsService.deletePoster(imageOptions);
	}

	// CompanyRole methods
	@Post(':filmId/companies/:companyId/roles')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
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
		return await this.filmsService.createCompanyRole(createCompanyRoleDto, roleOptions);
	}

	@Patch(':filmId/companies/:companyId/roles/:roleId')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
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
		return await this.filmsService.updateCompanyRole(updateCompanyRoleDto, roleOptions);
	}

	@Delete(':filmId/companies/:companyId/roles/:roleId')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
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
		return await this.filmsService.deleteCompanyRole(roleOptions);
	}

	// PersonRole methods
	@Post(':filmId/people/:personId/roles')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
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
		return await this.filmsService.createPersonRole(createPersonRoleDto, roleOptions);
	}

	@Patch(':filmId/people/:personId/roles/:roleId')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
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
		return await this.filmsService.updatePersonRole(updatePersonRoleDto, roleOptions);
	}

	@Delete(':filmId/people/:personId/roles/:roleId')
	@UseGuards(FilmsEditGuard)
	@EditLock(true)
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
		return await this.filmsService.deletePersonRole(roleOptions);
	}
}