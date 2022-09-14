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
import * as sharp from 'sharp';
import { Storage } from '@google-cloud/storage'
import { ConfigService } from '@nestjs/config'
import { FileFieldsInterceptor } from '@nestjs/platform-express';


const storage = new Storage();

@Controller('files')
export class FilesController {
	constructor(private configService: ConfigService){}

	@Post()
	@UseInterceptors(FileFieldsInterceptor([
		{name: 'poster', maxCount: 1},
		{name: 'still', maxCount: 1}
	]))
	uploadFile(@UploadedFiles() images: { poster?: Express.Multer.File[], still?: Express.Multer.File[] }){
		//console.log(images)
		const posterBucket = storage.bucket(this.configService.get('STORAGE_POSTERS'));
		const poster = images.poster[0]
		let url: string

		async function liz(){
			return await sharp(images.poster[0].buffer)
			.resize(500, 750)
			.toFormat('png')
			.toBuffer()
		}
		liz().then((file)=> {
			const blob = posterBucket.file(poster.originalname);
			const blobStream = blob.createWriteStream({
		    resumable: false,
		  });
		  console.log(blob, blobStream)
		  blobStream.on('error', err => {
		    return err
		  });
		  blobStream.on('finish', () => {
		    url = `https://storage.googleapis.com/${posterBucket.name}/${blob.name}`
		  });
		})
		//console.log()
		return url
	}
}