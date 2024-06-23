import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Storage, File, Bucket } from '@google-cloud/storage';
import * as sharp from 'sharp';
import * as path from 'path';
import { UploadedFileDto } from './storage.dto'
import { DeleteObjectCommand, GetObjectAclCommandInput, GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
	constructor(private config: ConfigService){}

	private client = new S3Client({
		endpoint: this.config.get('BB_ENDPOINT'),
		region: this.config.get('BB_REGION')
	})

	private bucket: string = this.config.get('BB_BUCKET')
	private readonly photoBaseUrl: string = this.config.get('HOST_URL');
	
	public async plainUpload(buffer: Buffer, mimetype: string, name: string){
		try {
			const file: PutObjectCommandInput = {
				Bucket: this.bucket,
				Body: buffer,
				Key: name,
				ContentType: mimetype
			}

			const command = new PutObjectCommand(file);
			await this.client.send(command);

			return {
				name: name,
				url: this.photoBaseUrl?.substring(0, 5) === 'https' ? `${this.photoBaseUrl}/storage/${name}` : `https://f003.backblazeb2.com/file/${this.bucket}/${name}`
			}
		} catch(err: any){
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	private async fileUploader(
		width: number, 
		height: number, 
		originalBuffer: Express.Multer.File['buffer'],
		format: Express.Multer.File['mimetype'],
		name: string,
		original: boolean,
		logo: boolean
		) {
		try {
			if(original === true){
				// For uploading original untouched photos.

				const {data, info} = await sharp(originalBuffer).toFormat('webp').toBuffer({resolveWithObject: true});

				const file: PutObjectCommandInput = {
					Bucket: this.bucket,
					Body: data,
					Key: name,
					ContentType: format
				}

				const command = new PutObjectCommand(file);
				await this.client.send(command);

				return {
					name: name,
					url: this.photoBaseUrl?.substring(0, 5) === 'https' ? `${this.photoBaseUrl}/storage/${name}` : `https://f003.backblazeb2.com/file/${this.bucket}/${name}`,
					dimensions: `${info.width}x${info.height}`,
					size: info.size
				}

			} else if(logo === true){
				// For optimising company logos

				const img = sharp(originalBuffer);
				const og = await img.metadata();
				const scaleFactor = Math.min(width / og.width, height / og.height);
				
				const newWidth = Math.round(og.width * scaleFactor);
    		const newHeight = Math.round(og.height * scaleFactor);

				const resizedImg = img.resize(newWidth, newHeight, {fit: 'inside'})

				const {data, info} = await img.extend({
					top: Math.floor((height - newHeight) / 2),
					bottom: Math.ceil((height - newHeight) / 2),
					left: Math.floor((width - newWidth) / 2),
					right: Math.ceil((width - newWidth) / 2),
					background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
				}).toFormat('webp').toBuffer({resolveWithObject: true});

				const file: PutObjectCommandInput = {
					Bucket: this.bucket,
					Body: data,
					Key: name,
					ContentType: info.format
				}

				const command = new PutObjectCommand(file);
				await this.client.send(command);
				
				return {
					name: name,
					url: this.photoBaseUrl?.substring(0, 5) === 'https' ? `${this.photoBaseUrl}/storage/${name}` : `https://f003.backblazeb2.com/file/${this.bucket}/${name}`,
					dimensions: `${info.width}x${info.height}`,
					size: info.size
				}

			} else {
				// For optimising all the other photos

				const {data, info} = await sharp(originalBuffer).resize(width, height).toFormat('webp').toBuffer({resolveWithObject: true});

				const file: PutObjectCommandInput = {
					Bucket: this.bucket,
					Body: data,
					Key: name,
					ContentType: info.format
				}

				const command = new PutObjectCommand(file);
				await this.client.send(command);

				return {
					name: name,
					url: this.photoBaseUrl?.substring(0, 5) === 'https' ? `${this.photoBaseUrl}/storage/${name}` : `https://f003.backblazeb2.com/file/${this.bucket}/${name}`,
					dimensions: `${info.width}x${info.height}`,
					size: info.size
				}
			}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async getPhoto(name: string){
		const fileData: GetObjectAclCommandInput = {
			Key: name,
			Bucket: this.bucket
		}

		try {
			const command = new GetObjectCommand(fileData);
			const file = await this.client.send(command);

			if(!file.Body) { throw new NotFoundException('An error occured while fetching file') }
			
			const stream = await file.Body.transformToByteArray();
			return {
				buffer: Buffer.from(stream),
				type: file.ContentType
			}			
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async deletePhoto(name: string){
		const command = new DeleteObjectCommand({ Key: name, Bucket: this.bucket })
		try {
			await this.client.send(command)
			return {"status": "deleted"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async uploadPoster(poster: Express.Multer.File){
		const maxSize = 5*(1024*1000);
		if(poster.size > maxSize) { throw new BadRequestException('File size too big') }

		if(poster.mimetype === 'image/png' || poster.mimetype === 'image/jpeg' || poster.mimetype === 'image/webp'){
			const timeNow = Date.now().toString();

			const originalName = poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow);
			const optimisedName = poster.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('optmsd');
			// console.log(optimisedName, originalName)
			try{
				const meta = await sharp(poster.buffer).metadata();
				if(meta.width < 500){ throw new BadRequestException('The resolution is too low.') }

				const original = await this.fileUploader(0, 0, poster.buffer, poster.mimetype, originalName, true, false)
				const optimised = await this.fileUploader(1280, 1920, poster.buffer, poster.mimetype, optimisedName, false, false);
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					optimisedUrl: optimised.url,
					optimisedName: optimised.name,
					optimisedDimensions: optimised.dimensions,
					optimisedSize: optimised.size
				}
			} catch(err: any) {
				// console.log(err)
				throw new BadRequestException(err?.message)
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async uploadStill(still: Express.Multer.File){
		const maxSize = 5*(1024*1000);
		if(still.size > maxSize) { throw new BadRequestException('File size too big') }

		if(still.mimetype === 'image/png' || still.mimetype === 'image/jpeg' || still.mimetype === 'image/webp'){
			const timeNow = Date.now().toString();

			const originalName = still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow);
			const optimisedName = still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('optmsd');
			// console.log(optimisedName, originalName)
			try{
				const meta = await sharp(still.buffer).metadata();
				if(meta.width < 600){ throw new BadRequestException('The resolution is too low.') }

				const original = await this.fileUploader(0,0, still.buffer, still.mimetype, originalName, true, false);
				const optimised = await this.fileUploader(1920, 1080, still.buffer, still.mimetype, optimisedName, false, false);
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					optimisedUrl: optimised.url,
					optimisedName: optimised.name,
					optimisedDimensions: optimised.dimensions,
					optimisedSize: optimised.size
				}
			} catch(err: any){
				throw new BadRequestException(err?.message);
			}
		}	else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async uploadProfilePhoto(profile: Express.Multer.File) {
		const maxSize = 5*(1024*1000);
		if(profile.size > maxSize) { throw new BadRequestException('File size too big') }
		if(profile.mimetype === 'image/png' || profile.mimetype === 'image/jpeg' || profile.mimetype === 'image/webp'){
			const timeNow = Date.now().toString();

			const originalName = profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow);
			const optimisedName = profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('optmsd');
			try{
				const meta = await sharp(profile.buffer).metadata();
				if(meta.width < 500){ throw new BadRequestException('The resolution is too low.') }

				const original = await this.fileUploader(0,0, profile.buffer, profile.mimetype, originalName, true, false);
				const optimised = await this.fileUploader(1080, 1080, profile.buffer, profile.mimetype, optimisedName, false, false);
				
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					optimisedUrl: optimised.url,
					optimisedName: optimised.name,
					optimisedDimensions: optimised.dimensions,
					optimisedSize: optimised.size
				}
			} catch(err: any){
				throw new BadRequestException(err?.message);
			}
		} else { 
			throw new BadRequestException("Unrecognised file extension");
		}
	}

	async uploadCover(still: Express.Multer.File){
		const maxSize = 3*(1024*1000);
		if(still.size > maxSize) { throw new BadRequestException('File size too big') }

		if(still.mimetype === 'image/png' || still.mimetype === 'image/jpeg' || still.mimetype === 'image/webp'){
			const timeNow = Date.now().toString();

			const originalName = still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow);
			const optimisedName = still.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('optmsd');
			try{
				const meta = await sharp(still.buffer).metadata();
				if(meta.width < 500){ throw new BadRequestException('The resolution is too low.') }

				const original = await this.fileUploader(0,0, still.buffer, still.mimetype, originalName, true, false);
				const optimised = await this.fileUploader(1920, 1080, still.buffer, still.mimetype, optimisedName, false, false);
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					optimisedUrl: optimised.url,
					optimisedName: optimised.name,
					optimisedDimensions: optimised.dimensions,
					optimisedSize: optimised.size
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
			const timeNow = Date.now().toString();

			const originalName = photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow);
			const optimisedName = photo.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('optmsd');
			try{
				const meta = await sharp(photo.buffer).metadata();
				if(meta.width < 500){ throw new BadRequestException('The resolution is too low.') }

				const original = await this.fileUploader(0,0, photo.buffer, photo.mimetype, originalName, true, false);
				const optimised = await this.fileUploader(1280,720, photo.buffer, photo.mimetype, optimisedName, false, false);
				
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					optimisedUrl: optimised.url,
					optimisedName: optimised.name,
					optimisedDimensions: optimised.dimensions,
					optimisedSize: optimised.size
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
			const timeNow = Date.now().toString();

			const originalName = profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow);
			const optimisedName = profile.originalname.replace(/[^0-9a-z]/gi, '-').concat(timeNow).concat('optmsd');
			try{
				const meta = await sharp(profile.buffer).metadata();
				if(meta.width < 400){ throw new BadRequestException('The resolution is too low.') }

				const original = await this.fileUploader(0,0, profile.buffer, profile.mimetype, originalName, true, false);
				const optimised = await this.fileUploader(1080, 1080, profile.buffer, profile.mimetype, optimisedName, false, true);
				
				return {
					originalUrl: original.url,
					originalName: original.name,
					originalDimensions: original.dimensions,
					originalSize: original.size,
					optimisedUrl: optimised.url,
					optimisedName: optimised.name,
					optimisedDimensions: optimised.dimensions,
					optimisedSize: optimised.size
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