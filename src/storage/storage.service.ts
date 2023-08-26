import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Storage, File, Bucket } from '@google-cloud/storage';
import * as sharp from 'sharp';
import * as path from 'path';
import { UploadedFileDto } from './storage.dto'

@Injectable()
export class StorageService extends Storage {
	constructor(private configService: ConfigService){
		super()
	}

	private readonly photoBucket = this.bucket(this.configService.get('STORAGE_IMAGES'));
	private readonly photoBaseUrl: string = this.configService.get('HOST_URL');

	private async fileUploader(
		width: number, 
		height: number, 
		originalBuffer: Express.Multer.File['buffer'],
		blob: File, 
		format: Express.Multer.File['mimetype'],
		bucket: Bucket,
		original: boolean,
		logo: boolean
		) {
		try {
			if(original === true){

				const {data, info} = await sharp(originalBuffer).toFormat('webp').toBuffer({resolveWithObject: true});

				await blob.save(data, {contentType: format});
				return {
					name: blob.name,
					url: this.photoBaseUrl.substring(0, 5) === 'https' ? `${this.photoBaseUrl}/storage/${blob.name}` : `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
					dimensions: `${info.width}x${info.height}`,
					size: info.size
				}

			} else if(logo === true){

				const img = await sharp(originalBuffer);
				const og = await img.metadata();
				const scaleFactor = Math.min(width / og.width, height / og.height);
				
				const newWidth = Math.round(og.width * scaleFactor);
    		const newHeight = Math.round(og.height * scaleFactor);

				const resizedImg = await img.resize(newWidth, newHeight, {fit: 'inside'})

				// console.log(width, newWidth, og.width, height, newHeight, og.height, {
				// 	top: Math.floor((height - newHeight) / 2),
				// 	bottom: Math.ceil((height - newHeight) / 2),
				// 	left: Math.floor((width - newWidth) / 2),
				// 	right: Math.ceil((width - newWidth) / 2)
				// })
				const {data, info} = await img.extend({
					top: Math.floor((height - newHeight) / 2),
					bottom: Math.ceil((height - newHeight) / 2),
					left: Math.floor((width - newWidth) / 2),
					right: Math.ceil((width - newWidth) / 2),
					background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
				}).toFormat('webp').toBuffer({resolveWithObject: true});
				// console.log('it finishes')
				await blob.save(data, {contentType: format});
				return {
					name: blob.name,
					url: this.photoBaseUrl.substring(0, 5) === 'https' ? `${this.photoBaseUrl}/storage/${blob.name}` : `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
					dimensions: `${info.width}x${info.height}`,
					size: info.size
				}

			} else {

				const {data, info} = await sharp(originalBuffer).resize(width, height).toFormat('webp').toBuffer({resolveWithObject: true});

				await blob.save(data, {contentType: format});
				return {
					name: blob.name,
					url: this.photoBaseUrl.substring(0, 5) === 'https' ? `${this.photoBaseUrl}/storage/${blob.name}` : `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
					dimensions: `${info.width}x${info.height}`,
					size: info.size
				}
			}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async getPhoto(name: string){
		try {
			const [file] = await this.photoBucket.file(name).download()
			const meta = await this.photoBucket.file(name).getMetadata()

			return {
				buffer: file,
				type: meta[0].contentType
			}
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async deletePhoto(name: string){
		try {
			await this.photoBucket.file(name).delete();
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadPoster(poster: Express.Multer.File){
		const maxSize = 5*(1024*1000);
		if(poster.size > maxSize) { throw new BadRequestException('File size too big') }

		if(poster.mimetype === 'image/png' || poster.mimetype === 'image/jpeg' || poster.mimetype === 'image/webp'){
			const posterBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			const blobLQ = posterBucket.file(poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('LQ'));
			try{
				const original = await this.fileUploader(0, 0, poster.buffer, blobOriginal, poster.mimetype, posterBucket, true, false)
				const hd = await this.fileUploader(1280, 1920, poster.buffer, blobHD, poster.mimetype, posterBucket, false, false);
				const sd = await this.fileUploader(720, 1080, poster.buffer, blobSD, poster.mimetype, posterBucket, false, false);
				const lq = await this.fileUploader(320, 480, poster.buffer, blobLQ, poster.mimetype, posterBucket, false, false);
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
		const maxSize = 5*(1024*1000);
		if(still.size > maxSize) { throw new BadRequestException('File size too big') }

		if(still.mimetype === 'image/png' || still.mimetype === 'image/jpeg' || still.mimetype === 'image/webp'){
			const stillBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			const blobLQ = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('LQ'));
			try{
				const original = await this.fileUploader(0,0, still.buffer, blobOriginal, still.mimetype, stillBucket, true, false);
				const hd = await this.fileUploader(1920, 1080, still.buffer, blobHD, still.mimetype, stillBucket, false, false);
				const sd = await this.fileUploader(853, 480, still.buffer, blobSD, still.mimetype, stillBucket, false, false);
				const lq = await this.fileUploader(427, 240, still.buffer, blobLQ, still.mimetype, stillBucket, false, false);
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
		const maxSize = 3*(1024*1000);
		if(profile.size > maxSize) { throw new BadRequestException('File size too big') }
		if(profile.mimetype === 'image/png' || profile.mimetype === 'image/jpeg' || profile.mimetype === 'image/webp'){
			const profileBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			try{
				const original = await this.fileUploader(0,0, profile.buffer, blobOriginal, profile.mimetype, profileBucket, true, false);
				const hd = await this.fileUploader(1080, 1080, profile.buffer, blobHD, profile.mimetype, profileBucket, false, false);
				const sd = await this.fileUploader(720, 720, profile.buffer, blobSD, profile.mimetype, profileBucket, false, false);
				
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

	async uploadCover(still: Express.Multer.File){
		const maxSize = 3*(1024*1000);
		if(still.size > maxSize) { throw new BadRequestException('File size too big') }

		if(still.mimetype === 'image/png' || still.mimetype === 'image/jpeg' || still.mimetype === 'image/webp'){
			const stillBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			const blobLQ = stillBucket.file(still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('LQ'));
			try{
				const original = await this.fileUploader(0,0, still.buffer, blobOriginal, still.mimetype, stillBucket, true, false);
				const hd = await this.fileUploader(1920, 1080, still.buffer, blobHD, still.mimetype, stillBucket, false, false);
				const sd = await this.fileUploader(1080, 720, still.buffer, blobSD, still.mimetype, stillBucket, false, false);
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
		}	else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async uploadContentPhoto(photo: Express.Multer.File) {
		const maxSize = 3*(1024*1000);
		if(photo.size > maxSize) { throw new BadRequestException('File size too big') }
		if(photo.mimetype === 'image/png' || photo.mimetype === 'image/jpeg' || photo.mimetype === 'image/webp'){
			const photoBucket = this.photoBucket;
			const timeNow = Date.now().toString();

			const blobOriginal = photoBucket.file(photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = photoBucket.file(photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = photoBucket.file(photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			try{

				const original = await this.fileUploader(0,0, photo.buffer, blobOriginal, photo.mimetype, photoBucket, true, false);
				const hd = await this.fileUploader(1280,720, photo.buffer, blobHD, photo.mimetype, photoBucket, false, false);
				const sd = await this.fileUploader(853,480, photo.buffer, blobSD, photo.mimetype, photoBucket, false, false);
				
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

	async uploadCompanyLogo(profile: Express.Multer.File) {
		const maxSize = 3*(1024*1000);
		if(profile.size > maxSize) { throw new BadRequestException('File size too big') }
		if(profile.mimetype === 'image/png' || profile.mimetype === 'image/jpeg' || profile.mimetype === 'image/webp'){
			const profileBucket = this.photoBucket
			const timeNow = Date.now().toString();

			const blobOriginal = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow));
			const blobHD = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('HD'));
			const blobSD = profileBucket.file(profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('SD'));
			try{
				const original = await this.fileUploader(0,0, profile.buffer, blobOriginal, profile.mimetype, profileBucket, true, false);
				const hd = await this.fileUploader(1080, 1080, profile.buffer, blobHD, profile.mimetype, profileBucket, false, true);
				const sd = await this.fileUploader(720, 720, profile.buffer, blobSD, profile.mimetype, profileBucket, false, true);
				
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
				console.log(err)
				throw new BadRequestException(err?.message);
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}
}