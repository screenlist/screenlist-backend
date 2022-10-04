import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Storage } from '@google-cloud/storage';
import * as sharp from 'sharp';
import * as path from 'path';
import { UploadedFileDto } from './storage.dto'

@Injectable()
export class StorageService extends Storage {
	constructor(private configService: ConfigService){
		super({
			projectId: configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../config/cloud-keys.json')
		})
	}

	async uploadPoster(poster: Express.Multer.File):Promise<UploadedFileDto[]>{
		if(poster.mimetype === 'image/png' || poster.mimetype === 'image/jpeg'){
			const posterBucket = this.bucket(this.configService.get('STORAGE_POSTERS'));

			const blobHighDef = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '').concat('HD'));
			const blobStandardDef = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '').concat('SD'));
			try{
				// Process to High Definition
				const bufferHighDef = await sharp(poster.buffer).resize(1000, 1500).toBuffer();
				await blobHighDef.save(bufferHighDef, {contentType: poster.mimetype});
				// Process to Standard Definition
				const bufferStandardDef = await sharp(poster.buffer).resize(480, 720).toBuffer();
				await blobStandardDef.save(bufferStandardDef, {contentType: poster.mimetype});
				return [
					{
						originalName: blobHighDef.name, 
						quality: "HD",
						url: `https://storage.googleapis.com/${posterBucket.name}/${blobHighDef.name}`
					}, 
					{
						originalName: blobStandardDef.name, 
						quality: "SD",
						url: `https://storage.googleapis.com/${posterBucket.name}/${blobStandardDef.name}`
					}
				]
			} catch(err: any) {
				throw new BadRequestException(err?.message)
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async deletePoster(name: string){
		const posterBucket = this.bucket(this.configService.get('STORAGE_POSTERS'));
		try {
			await posterBucket.file(name).delete();
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadStill(still: Express.Multer.File): Promise<UploadedFileDto>{
		if(still.mimetype === 'image/png' || still.mimetype === 'image/jpeg'){
			const stillBucket = this.bucket(this.configService.get('STORAGE_STILLS'));
			const blobHighDef = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '').concat('HD'));
			try{
				const bufferHighDef = await sharp(still.buffer).resize(1920, 1080).toBuffer();
				await blobHighDef.save(bufferHighDef, {contentType: still.mimetype});
				return {
					originalName: blobHighDef.name, 
					quality: "HD",
					url: `https://storage.googleapis.com/${stillBucket.name}/${blobHighDef.name}`
				}
			} catch(err: any){
				throw new BadRequestException(err?.message);
			}
		}	else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async deleteStill(name: string){
		const stillBucket = this.bucket(this.configService.get('STORAGE_STILLS'));
		try {
			await stillBucket.file(name).delete();
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadProfilePhoto(profile: Express.Multer.File): Promise<UploadedFileDto>{
		if(profile.mimetype === 'image/png' || profile.mimetype === 'image/jpeg'){
			const profileBucket = this.bucket(this.configService.get('STORAGE_PROFILES'));
			const blobHighDef = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '').concat('HD'));
			try{
				const bufferHighDef = await sharp(profile.buffer).resize(720, 720).toBuffer();
				await blobHighDef.save(bufferHighDef, {contentType: profile.mimetype});
				return {
					originalName: blobHighDef.name, 
					quality: "HD",
					url: `https://storage.googleapis.com/${profileBucket.name}/${blobHighDef.name}`
				}
			} catch(err: any){
				throw new BadRequestException(err?.message);
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async deleteProfilePhoto(name: string){
		const profileBucket = this.bucket(this.configService.get('STORAGE_PROFILES'));
		try {
			await profileBucket.file(name).delete();
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}
}