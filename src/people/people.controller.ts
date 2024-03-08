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
import { CollectionFields } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import {
	CreatePersonDto,
	UpdatePersonDto
} from './people.dto';
import {
	Person,
	PersonOpt
} from './people.types';
import { PeopleService } from './people.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotoDto } from '../films/films.dto';
import { ImageOpt } from  '../films/films.types';
import { EditGuard } from 'src/films/films.edit.guard';
import { EditLock } from 'src/films/films.edit.decorator';

@Controller('people')
@UseGuards(RolesGuard)
export class PeopleController {
	constructor(
		private peopleService: PeopleService,
		private authService: AuthService
	){}

	@Get()
	async findAll(
		@Query('page') page: number,
		@Query('limit') limit: number
	){
		return await this.peopleService.findAll(page, limit);
	}

	@Post()
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('people')
	async createOne(
		@Body() createPersonDto: CreatePersonDto,
		@Headers('x-user-id') userId: string
	){
		const personOptions: PersonOpt = {
			user: userId,
			time: new Date()
		}
		return await this.peopleService.createOne(createPersonDto, personOptions);
	}

	@Get(':id')
	@UseGuards(FrequencyGuard)
	@Frequency('people')
	async findOne(@Param('id') id: string){
		return await this.peopleService.findOne(id);
	}

	@Patch(':id')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('people')
	async updateOne(
		@Param('id') id: string,
		@Body('update') updatePersonDto: UpdatePersonDto,
		@Body('remove') toRemove: CollectionFields<Person>,
		@Headers('x-user-id') userId: string
	){
		const personOptions: PersonOpt = {
			user: userId,
			time: new Date(),
			personId: id
		}
		return await this.peopleService.updateOne(updatePersonDto, personOptions, toRemove);
	}

	@Delete(':id')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('people')
	async deleteOne(
		@Param('id') id: string,
		@Headers('x-user-id') userId: string
	){
		const personOptions: PersonOpt = {
			user: userId,
			time: new Date(),
			personId: id
		}
		return await this.peopleService.deleteOne(personOptions)
	}

	@Get(':id/history')
	async findHistory(
		@Param('id') personId: string,
		@Headers('x-page-cursor') cursor: string
	){
		return await this.peopleService.findHistory(personId);
	}

	// Settings routes
	@Patch(':id/settings/verify')
	@Roles('member')
	async verifyEdit(
		@Param('id') id: string
	){
		return await this.peopleService.verifyEdit(id);
	}

	@Patch(':id/settings/hide')
	@Roles('moderator')
	async hideFilm(
		@Param('id') id: string
	){
		return await this.peopleService.hideFilm(id);
	}

	@Patch(':id/settings/unhide')
	@Roles('moderator')
	async unhideFilm(
		@Param('id') id: string
	){
		return await this.peopleService.unhideFilm(id);
	}

	@Patch(':id/settings/lock')
	@Roles('moderator')
	async lockFilmEdit(
		@Param('id') id: string
	){
		return await this.peopleService.lockFilmEdit(id);
	}

	@Patch(':id/settings/unlock')
	@Roles('moderator')
	async unlockFilmEdit(
		@Param('id') id: string
	){
		return await this.peopleService.unlockFilmEdit(id);
	}

	// Photos routes
	@Post(':id/photo')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('people')
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
			parentKind: 'people',
			index: index
		}
		return await this.peopleService.uploadPhoto(imageOptions, profile);
	}

	@Patch(':id/photo')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('people')
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
			parentKind: 'people',
			index: index
		}
		return await this.peopleService.updatePhoto(updatePhoto, imageOptions);
	}

	@Delete(':id/photo')
	@Roles('member')
	@UseGuards(EditGuard)
	@EditLock('people')
	async removePhoto(
		@Param('id') id: string,
		@Query('index') index: number,
		@Headers('x-user-id') userId: string
	){
		const imageOptions: ImageOpt = {
			user: userId,
			time: new Date(),
			parentId: id,
			parentKind: 'people',
			index: index
		}
		return await this.peopleService.removePhoto(imageOptions)
	}

	@Get('data/unmoderated')
	@Roles('moderator')
	async getUmoderated(){
		return await this.peopleService.findAllUnverified()
	}
}