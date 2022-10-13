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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import {
	CreatePlatformDto,
	UpdatePlatformDto,
	CreateLinkDto,
	UpdateLinkDto
} from './platforms.dto';
import {
	Platform,
	Link,
	PlatformOpt,
	LinkOpt
} from './platforms.types';
import { PlatformsService } from './platforms.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('platforms')
@UseGuards(RolesGuard)
export class PlatformsController {
	constructor(
		private platformsService: PlatformsService,
		private authService: AuthService
	){}

	@Get()
	async findAll(){
		return await this.platformsService.findAll();
	}

	@Post()
	@Roles('member')
	async createOne(
		@Body() createPlatformDto: CreatePlatformDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const platformOptions: PlatformOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.platformsService.createOne(createPlatformDto, platformOptions);
	}

	@Get(':id')
	async findOne(@Param('id') id: string){
		return this.platformsService.findOne(id);
	}

	@Patch(':id')
	@Roles('member')
	async updateOne(
		@Param('id') id: string,
		@Body() updatePlatformDto: UpdatePlatformDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const platformOptions: PlatformOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: id
		}
		return await this.platformsService.updateOne(updatePlatformDto, platformOptions);
	}

	@Delete(':id')
	@Roles('member')
	async deleteOne(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const platformOptions: PlatformOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: id
		}
		return await this.platformsService.deleteOne(platformOptions);
	}

	@Post(':id/photo')
	@Roles('member')
	@UseInterceptors(FileInterceptor('profile'))
	async uploadPhoto(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string,
		@UploadedFile() profile: Express.Multer.File
	){
		const platformOptions: PlatformOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: id
		}
		return await this.platformsService.uploadPhoto(platformOptions, profile);
	}

	@Delete(':id/photo')
	@Roles('member')
	async removePhoto(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const platformOptions: PlatformOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			platformId: id
		}
		return await this.platformsService.removePhoto(platformOptions)
	}
}
