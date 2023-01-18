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
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import {
	CreatePersonDto,
	UpdatePersonDto,
	CreatePersonRoleDto,
	UpdatePersonRoleDto
} from './people.dto';
import {
	Person,
	PersonRole,
	PersonOpt,
	PersonRoleOpt
} from './people.types';
import { PeopleService } from './people.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDisplayPhotoDto, UpdateDisplayPhotoDto } from '../films/films.dto';
import { ImageOpt } from  '../films/films.types';

@Controller('people')
@UseGuards(RolesGuard)
export class PeopleController {
	constructor(
		private peopleService: PeopleService,
		private authService: AuthService
	){}

	@Get()
	async findAll(){
		return await this.peopleService.findAll();
	}

	@Post()
	@Roles('member')
	async createOne(
		@Body() createPersonDto: CreatePersonDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const personOptions: PersonOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.peopleService.createOne(createPersonDto, personOptions);
	}

	@Get(':id')
	async findOne(@Param('id') id: string){
		return await this.peopleService.findOne(id);
	}

	@Patch(':id')
	@Roles('member')
	async updateOne(
		@Param('id') id: string,
		@Body() updatePersonDto: UpdatePersonDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const personOptions: PersonOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: id
		}
		return await this.peopleService.updateOne(updatePersonDto, personOptions);
	}

	@Delete(':id')
	@Roles('member')
	async deleteOne(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const personOptions: PersonOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			personId: id
		}
		return await this.peopleService.deleteOne(personOptions)
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
			parentKind: 'Person',
			imageId: index
		}
		return await this.peopleService.uploadPhoto(imageOptions, profile);
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
			parentKind: 'Person',
			imageId: index
		}
		return await this.peopleService.updatePhoto(updatePhoto, imageOptions);
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
			parentKind: 'Person',
			imageId: index
		}
		return await this.peopleService.removePhoto(imageOptions)
	}
}
