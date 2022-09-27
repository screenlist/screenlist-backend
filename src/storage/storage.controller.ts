import { 
	Controller, 
	Get,
	Post,
	Put,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	HttpException,
	UploadedFiles,
	UseInterceptors
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service'

@Controller('storage')
export class StorageController {
	constructor(private storageService: StorageService){}

	@Post('file')
	@UseInterceptors(FileFieldsInterceptor([
		{name: 'poster', maxCount: 1},
		{name: 'still', maxCount: 1}
	]))
	async uploadPhoto(@UploadedFiles() image: { poster?: Express.Multer.File[], still?: Express.Multer.File[] }) {
		if(image.poster){
			return await this.storageService.uploadPoster(image.poster[0])
		} else if(image.still){
			return await this.storageService.uploadStill(image.still[0])	
		}
	}
}
