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
	UploadedFile,
	UseInterceptors 
} from '@nestjs/common';
import { RolesGuard } from '../users/roles.guard';
import { EditGuard } from '../users/edit.guard';
import { FrequencyGuard } from '../database/frequency.guard';
import { Roles } from '../users/roles.decorator';
import { EditLock } from '../users/edit.decorator';
import { Frequency } from '../database/frequency.decorator';
import { AuthService } from '../auth/auth.service';
import { FilmsService } from './films.service';
import {
	CreateFilmDto, 
	UpdateFilmDto,
	CreateListRatingDto, 
	UpdateListRatingDto,
	PhotoDto
} from './films.dto';
import { 
	Film,
	ImageOpt,
	RatingOpt
} from './films.types';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { CollectionFields } from 'src/database/database.types';

@Controller('films')
@UseGuards(RolesGuard)
export class FilmsController {
	constructor(
		private filmsService: FilmsService,
		private authService: AuthService
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

	@Get('data/recent')
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

	@Get('data/hidden')
	@Roles('moderator')
	async getHidden(){
		return await this.filmsService.findAllHidden()
	}

	@Get('data/unmoderated-reviews')
	@Roles('moderator')
	async getUnmoderatedReviews(){
		return await this.filmsService.findUnverifiedRatings()
	}

	// Core film methods
	@Get()
	async findAll(
		@Query('page') page: number,
		@Query('limit') limit: number
	){
		return await this.filmsService.findAll(page, limit)
	}	

	@Post()
	@Roles('member')
	async createOne(
		@Body() createFilmDto: CreateFilmDto, 
		@Headers('x-user-id') userId: string
	){
		return await this.filmsService.createOne(createFilmDto, userId)
	}

	@Get(':id')
	@UseGuards(FrequencyGuard)
	@Frequency('films')
	async findOne(
		@Param('id') id: string,
		@Headers('x-user-id') userId: string,
		@Query('minimal') style: boolean
	){
		if(style === true){
			return await this.filmsService.findOneDetailsOnly(id)
		} else {
			return await this.filmsService.findOne(id, userId)
		}
	}

	@Patch(':id')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async updateOne(
		@Param('id') id: string, 
		@Body('update') updateFilmDto: UpdateFilmDto,
		@Body('remove') remove: CollectionFields<Film>,
		@Headers('x-user-id') userId: string
	){
		console.log(remove)
		return await this.filmsService.updateOne(updateFilmDto, userId, id, remove)
	}

	@Delete(':id')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async deleteOne(
		@Param('id') id: string, 
		@Headers('x-user-id') userId: string
	){
		return await this.filmsService.deleteOne(id, userId);
	}

	@Get(':id/history')
	async findHistory(
		@Param('id') filmId: string,
	){
		return await this.filmsService.findHistory(filmId);
	}

	// Settings
	@Patch(':id/settings/hide')
	@Roles('moderator')
	async hideFilm(
		@Param('id') id: string
	){
		return await this.filmsService.hideFilm(id);
	}

	@Patch(':id/settings/unhide')
	@Roles('moderator')
	async unhideFilm(
		@Param('id') id: string
	){
		return await this.filmsService.unhideFilm(id);
	}

	@Patch(':id/settings/verify')
	@Roles('moderator')
	async verifyFilmEdit(
		@Param('id') id: string,
		@Headers('x-user-id') userId: string
	){
		return await this.filmsService.verifyFilmEdit(id, userId);
	}

	@Patch(':id/settings/lock')
	@Roles('moderator')
	async lockFilmEdit(
		@Param('id') id: string
	){
		return await this.filmsService.lockFilmEdit(id);
	}

	@Patch(':id/settings/unlock')
	@Roles('moderator')
	async unlockFilmEdit(
		@Param('id') id: string
	){
		return await this.filmsService.unlockFilmEdit(id);
	}

	// Ratings methods
	@Post(':filmId/reviews')
	@Roles('journalist')
	async createReview(
		@Param('filmId') filmId: string,
		@Headers('x-user-id') userId: string,
		@Body() createListRatingDto: CreateListRatingDto
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films'
		}
		return await this.filmsService.createOneRating(createListRatingDto, imageOptions);
	}

	@Patch(':filmId/reviews/:reviewId')
	@Roles('journalist')
	async updateReview(
		@Param('filmId') filmId: string,
		@Param('reviewId') reviewId: string,
		@Headers('x-user-id') userId: string,
		@Body() updateListRatingDto: UpdateListRatingDto
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			ratingId: reviewId
		}
		return await this.filmsService.updateOneRating(updateListRatingDto, imageOptions);
	}

	@Delete(':filmId/reviews/:reviewId')
	@Roles('journalist')
	async deleteReview(
		@Param('filmId') filmId: string,
		@Param('reviewId') reviewId: string,
		@Headers('x-user-id') userId: string
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			ratingId: reviewId
		}
		return await this.filmsService.deleteOneRating(imageOptions);
	}

	@Patch(':filmId/reviews/:reviewId/verify')
	@Roles('moderator')
	async verifyReview(
		@Param('filmId') filmId: string,
		@Param('reviewId') reviewId: string,
		@Headers('x-user-id') userId: string
	){
		const imageOptions: RatingOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			ratingId: reviewId
		}
		return await this.filmsService.verifyRating(imageOptions);
	}

	// Still methods
	@Post(':filmId/stills')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	@UseInterceptors(FileInterceptor('still'))
	async uploadStill(
		@Param('filmId') filmId: string,
		@UploadedFile() still: Express.Multer.File,
		@Headers('x-user-id') userId: string,
		@Query('index') index: number
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			index: index
		}
		return await this.filmsService.uploadStill(imageOptions, still);
	}

	@Patch(':filmId/stills')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async updateStillDescription(
		@Param('filmId') filmId: string,
		@Body() updateStillDto: PhotoDto,
		@Headers('x-user-id') userId: string,
		@Query('index') index: number
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			index: index
		}
		return await this.filmsService.updateStill(updateStillDto, imageOptions);
	}

	@Delete(':filmId/stills')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async deleteStill(
		@Param('filmId') filmId: string,
		@Headers('x-user-id') userId: string,
		@Query('index') index: number
	){
		console.log("deletes still")
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			index: index
		}
		return await this.filmsService.deleteStill(imageOptions);
	}

	// Poster methods
	@Post(':filmId/posters')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	@UseInterceptors(FileInterceptor('poster'))
	async uploadPoster(
		@Param('filmId') filmId: string,
		@UploadedFile() poster: Express.Multer.File,
		@Headers('x-user-id') userId: string,
		@Body() body: any,
		@Query('index') index: number
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			index: index
		}
		console.log(body)
		console.log(poster)
		return await this.filmsService.uploadPoster(imageOptions, poster);
	}

	@Patch(':filmId/posters')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async updatePosterDescription(
		@Param('filmId') filmId: string,
		@Body() updatePosterDto: PhotoDto,
		@Headers('x-user-id') userId: string,
		@Query('index') index: number
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			index: index
		}
		return await this.filmsService.updatePoster(updatePosterDto, imageOptions);
	}

	@Delete(':filmId/posters')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async deletePoster(
		@Param('filmId') filmId: string,
		@Headers('x-user-id') userId: string,
		@Query('index') index: number
	){
		const imageOptions: ImageOpt = {
			time: new Date(),
			user: userId,
			parentId: filmId,
			parentKind: 'films',
			index: index
		}
		return await this.filmsService.deletePoster(imageOptions);
	}

	// CompanyRole methods
	@Post(':filmId/companies/:companyId/roles')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async createOneCompanyRole(
		@Param('filmId') filmId: string,
		@Param('companyId') companyId: string,
		@Body() createCompanyRoleDto: CreateCompanyRoleDto, 
		@Headers('x-user-id') userId: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: userId,
			time: new Date(),
			companyId: companyId,
			parentId: filmId,
			parentKind: 'films'
		}
		return await this.filmsService.createCompanyRole(createCompanyRoleDto, roleOptions);
	}

	@Patch(':filmId/companies/:companyId/roles/:roleId')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async updateOneCompanyRole(
		@Param('filmId') filmId: string,
		@Param('companyId') companyId: string,
		@Param('roleId') roleId: string,
		@Body() updateCompanyRoleDto: UpdateCompanyRoleDto, 
		@Headers('x-user-id') userId: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: userId,
			time: new Date(),
			companyId: companyId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'films'
		}
		return await this.filmsService.updateCompanyRole(updateCompanyRoleDto, roleOptions);
	}

	@Delete(':filmId/companies/:companyId/roles/:roleId')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async deleteOneCompanyRole(
		@Param('filmId') filmId: string,
		@Param('companyId') companyId: string,
		@Param('roleId') roleId: string,
		@Headers('x-user-id') userId: string
	){
		const roleOptions: CompanyRoleOpt = {
			user: userId,
			time: new Date(),
			companyId: companyId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'films'
		}
		return await this.filmsService.deleteCompanyRole(roleOptions);
	}

	// PersonRole methods
	@Post(':filmId/people/:personId/roles')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async createOnePersonRole(
		@Param('filmId') filmId: string,
		@Param('personId') personId: string,
		@Body() createPersonRoleDto: CreatePersonRoleDto, 
		@Headers('x-user-id') userId: string
	){
		const roleOptions: PersonRoleOpt = {
			user: userId,
			time: new Date(),
			personId: personId,
			parentId: filmId,
			parentKind: 'films'
		}
		return await this.filmsService.createPersonRole(createPersonRoleDto, roleOptions);
	}

	@Patch(':filmId/people/:personId/roles/:roleId')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async updateOnePersonRole(
		@Param('filmId') filmId: string,
		@Param('personId') personId: string,
		@Param('roleId') roleId: string,
		@Body() updatePersonRoleDto: UpdatePersonRoleDto, 
		@Headers('x-user-id') userId: string
	){
		const roleOptions: PersonRoleOpt = {
			user: userId,
			time: new Date(),
			personId: personId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'films'
		}
		return await this.filmsService.updatePersonRole(updatePersonRoleDto, roleOptions);
	}

	@Delete(':filmId/people/:personId/roles/:roleId')
	@UseGuards(EditGuard)
	@EditLock('films')
	@Roles('member')
	async deleteOnePersonRole(
		@Param('filmId') filmId: string,
		@Param('personId') personId: string,
		@Param('roleId') roleId: string, 
		@Headers('x-user-id') userId: string
	){
		const roleOptions: PersonRoleOpt = {
			user: userId,
			time: new Date(),
			personId: personId,
			parentId: filmId,
			roleId: roleId,
			parentKind: 'films'
		}
		return await this.filmsService.deletePersonRole(roleOptions);
	}
}