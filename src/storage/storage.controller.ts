import { 
	Controller, 
	Get,
	Res,
	Post,
	Put,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	HttpException,
	UploadedFiles,
	UseInterceptors, 
	BadRequestException,
	NotFoundException,
	StreamableFile
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service'

@Controller('storage')
export class StorageController {
	constructor(private storageService: StorageService){}

	@Get(':name')
	async getPhoto(@Param('name') name: string, @Res() res: Response){
		try {
			const {buffer, type} = await this.storageService.getPhoto(name);
			res.set('Content-Type', type)
			res.send(buffer)
		} catch (err: any){
			throw new NotFoundException()
		}
	}

	@Post('file')
	@UseInterceptors(FileFieldsInterceptor([
		{name: 'poster', maxCount: 1},
		{name: 'still', maxCount: 1},
		{name: 'profile', maxCount: 1}
	]))
	async uploadPhoto(@UploadedFiles() image: { 
		poster?: Express.Multer.File[], 
		still?: Express.Multer.File[] ,
		profile?: Express.Multer.File[]
	}) {
		throw new BadRequestException('Not allowed')
		if(image.poster){
			return await this.storageService.uploadPoster(image.poster[0])
		} else if(image.still){
			return await this.storageService.uploadStill(image.still[0])	
		} else if(image.profile){
			return await this.storageService.uploadProfilePhoto(image.still[0])	
		}
	}
}
