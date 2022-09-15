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
import { StillsService } from './stills.service'

@Controller('stills')
export class StillsController {
	constructor(private stillsService: StillsService){}

	@Post('file')
	@UseInterceptors(FileFieldsInterceptor([
		{name: 'poster', maxCount: 1},
		{name: 'still', maxCount: 1}
	]))
	async uploadPhoto(@UploadedFiles() image: { poster?: Express.Multer.File[], still?: Express.Multer.File[] }): Promise<any> {
		if(image.poster){
			return await this.stillsService.uploadPoster(image.poster[0])
		} else if(image.still){
			return await this.stillsService.uploadStill(image.still[0])	
		}
	}
}
