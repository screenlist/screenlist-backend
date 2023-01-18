import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Storage, File, Bucket } from '@google-cloud/storage';
import * as sharp from 'sharp';
import * as path from 'path';
import { UploadedFileDto } from './storage.dto'

@Injectable()
export class StorageService extends Storage {
	constructor(private configService: ConfigService){
		super({
			projectId: configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../config/store.json')
		})
	}

	private readonly photoBucket = this.bucket(this.configService.get('STORAGE_IMAGES'));

	private async fileUploader(
		width: number, 
		height: number, 
		originalBuffer: Express.Multer.File['buffer'],
		blob: File, 
		format: Express.Multer.File['mimetype'],
		bucket: Bucket,
		original?: boolean
		) {
		try {
			const {data, info} = original ? 
													await sharp(originalBuffer).toBuffer({resolveWithObject: true}) :
													await sharp(originalBuffer).resize(width, height).toBuffer({resolveWithObject: true});
			await blob.save(data, {contentType: format});
			return {
				name: blob.name,
				url: `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
				dimensions: `${info.width}x${info.height}`,
				size: info.size
			}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadPoster(poster: Express.Multer.File){
		console.log(poster)
		const maxSize = 3*(1024*1000);
		if(poster.size > maxSize) { throw new BadRequestException('File size too big') }

		if(poster.mimetype === 'image/png' || poster.mimetype === 'image/jpeg'){
			const posterBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			const blobLQ = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('LQ'));
			try{
				const original = await this.fileUploader(0, 0, poster.buffer, blobOriginal, poster.mimetype, posterBucket, true)
				const hd = await this.fileUploader(720, 1080, poster.buffer, blobHD, poster.mimetype, posterBucket);
				const sd = await this.fileUploader(320, 480, poster.buffer, blobSD, poster.mimetype, posterBucket);
				const lq = await this.fileUploader(160, 240, poster.buffer, blobLQ, poster.mimetype, posterBucket);
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					hdUrl: hd.url,
					hdName: hd.name,
					hdDimensions: hd.dimensions,
					hdSize: hd.size,
					sdUrl: sd.url,
					sdName: sd.name,
					sdDimensions: sd.dimensions,
					sdSize: sd.size,
					lqUrl: lq.url,
					lqName: lq.name,
					lqDimensions: lq.dimensions,
					lqSize: lq.size,
				}
			} catch(err: any) {
				throw new BadRequestException(err?.message)
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async deletePoster(name: string){
		const posterBucket = this.photoBucket
		try {
			await posterBucket.file(name).delete();
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadStill(still: Express.Multer.File){
		if(still.mimetype === 'image/png' || still.mimetype === 'image/jpeg'){
			const stillBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			const blobLQ = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('LQ'));
			try{
				const original = await this.fileUploader(0,0, still.buffer, blobOriginal, still.mimetype, stillBucket, true);
				const hd = await this.fileUploader(1920, 1080, still.buffer, blobHD, still.mimetype, stillBucket);
				const sd = await this.fileUploader(853, 480, still.buffer, blobSD, still.mimetype, stillBucket);
				const lq = await this.fileUploader(427, 240, still.buffer, blobLQ, still.mimetype, stillBucket);
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					hdUrl: hd.url,
					hdName: hd.name,
					hdDimensions: hd.dimensions,
					hdSize: hd.size,
					sdUrl: sd.url,
					sdName: sd.name,
					sdDimensions: sd.dimensions,
					sdSize: sd.size,
					lqUrl: lq.url,
					lqName: lq.name,
					lqDimensions: lq.dimensions,
					lqSize: lq.size,
				}
			} catch(err: any){
				throw new BadRequestException(err?.message);
			}
		}	else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async deleteStill(name: string){
		const stillBucket = this.photoBucket
		try {
			await stillBucket.file(name).delete();
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadProfilePhoto(profile: Express.Multer.File) {
		if(profile.mimetype === 'image/png' || profile.mimetype === 'image/jpeg'){
			const profileBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			try{
				const original = await this.fileUploader(0,0, profile.buffer, blobOriginal, profile.mimetype, profileBucket, true);
				const hd = await this.fileUploader(720, 720, profile.buffer, blobHD, profile.mimetype, profileBucket);
				const sd = await this.fileUploader(480, 480, profile.buffer, blobSD, profile.mimetype, profileBucket);
				
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					hdUrl: hd.url,
					hdName: hd.name,
					hdDimensions: hd.dimensions,
					hdSize: hd.size,
					sdUrl: sd.url,
					sdName: sd.name,
					sdDimensions: sd.dimensions,
					sdSize: sd.size
				}
			} catch(err: any){
				throw new BadRequestException(err?.message);
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async deleteProfilePhoto(name: string){
		const profileBucket = this.photoBucket
		try {
			await profileBucket.file(name).delete();
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadContentPhoto(photo: Express.Multer.File) {
		if(photo.mimetype === 'image/png' || photo.mimetype === 'image/jpeg'){
			const photoBucket = this.photoBucket;
			const timeNow = Date.now().toString();

			const blobOriginal = photoBucket.file(photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = photoBucket.file(photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = photoBucket.file(photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			try{

				const original = await this.fileUploader(0,0, photo.buffer, blobOriginal, photo.mimetype, photoBucket, true);
				const hd = await this.fileUploader(1280,720, photo.buffer, blobHD, photo.mimetype, photoBucket);
				const sd = await this.fileUploader(853,480, photo.buffer, blobSD, photo.mimetype, photoBucket);
				
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					hdUrl: hd.url,
					hdName: hd.name,
					hdDimensions: hd.dimensions,
					hdSize: hd.size,
					sdUrl: sd.url,
					sdName: sd.name,
					sdDimensions: sd.dimensions,
					sdSize: sd.size
				}
			} catch(err: any){
				throw new BadRequestException(err?.message);
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}
}