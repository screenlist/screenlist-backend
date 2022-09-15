import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Storage } from '@google-cloud/storage';
import * as sharp from 'sharp';
import * as path from 'path';
import { Poster } from '../posters/posters.entity';

@Injectable()
export class StillsService {
	constructor(private configService: ConfigService){}

	private storage = new Storage({
		projectId: this.configService.get('PROJECT_ID'),
		keyFilename: path.join(__dirname, '../../cloud-keys.json')
	})

	async uploadPoster(poster: Express.Multer.File):Promise<any>{
		if(poster.mimetype === 'image/png' || poster.mimetype === 'image/jpeg'){
			const posterBucket = this.storage.bucket(this.configService.get('STORAGE_POSTERS'));
			const blob = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, ''));
			try{
				const buffer = await sharp(poster.buffer).resize(1000, 1500).toBuffer()
				await blob.save(buffer, {contentType: poster.mimetype})
				return {originalName: blob.name, url: `https://storage.googleapis.com/${posterBucket.name}/${blob.name}`}
			} catch(err: any) {
				throw new BadRequestException(err?.message)
			}
		}
		throw new BadRequestException("Unrecognised file extension")
	}

	async uploadStill(still: Express.Multer.File): Promise<any>{
		const stillBucket = this.storage.bucket(this.configService.get('STORAGE_STILLS'));
		const blob = stillBucket.file(still.originalname);
		const blobStream = blob.createWriteStream({
		  resumable: false,
		});
		blobStream.on('finish', () => {console.log(`https://storage.googleapis.com/${stillBucket.name}/${blob.name}`)})
	}
}