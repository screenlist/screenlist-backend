import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException, StreamableFile } from '@nestjs/common';
import axios from 'axios';
import fetch from 'cross-fetch';
import { DatabaseService } from './database/database.service';
import { SearchService } from './search/search.service';
import { HistoryService } from './history/history.service';
import { StorageService } from './storage/storage.service';
import { Photo } from './films/films.types';

@Injectable()
export class AppService {
	constructor(
		private mongo: DatabaseService,
		private search: SearchService,
		private history: HistoryService,
		private storage: StorageService
	) {
		this.onStartUp()
	}

	async onStartUp(){
		try {
			await this.mongo.connectDB()
			await this.search.indexAll()
			// await this.history.mega()
			// await this.history.transferImages()
			// await this.history.redistrubuteImagesAsIntended()
		} catch(err: any){
			console.log(err)
		}
	}

	getHello(): string {
		return 'Copyright 2023, Makamuta Pty Ltd.';
	}

	async getImage(path: string) {
    try {
      if(!path) { throw new BadRequestException('Provide the path') }
      const res = await fetch(path);
    	if(res.status >= 400){ throw new BadRequestException('Error Extracting Image') }
    	const blob = await res.blob()
    	if(blob.type == 'image/png' || blob.type == 'image/jpeg' || blob.type == 'image/webp'){
	    	const unit8 = new Uint8Array(await blob.arrayBuffer())
	    	return {uint8: unit8, type: blob.type}
	    } else { throw new BadRequestException('Unsupported File Extension') }
    } catch (err: any) {
      throw new BadRequestException(err.message)
    }
  }

	async reOptimiseImages(){
		//This must only be run once and adjusted should the need arise. It's just a script.
		try {
			const photos = await this.search.drillThrough<Photo>('photos')
			console.log('******************BEGIN OPTIMISATION**********************')
			for await (let photo of photos){
				const originalWidth = ~photo.originalDimensions.split('x')[0]
				const originalHeight = ~photo.originalDimensions.split('x')[1]
				const optimisedWidth = ~photo.optimisedDimensions.split('x')[0]
				const optimisedHeight = ~photo.optimisedDimensions.split('x')[1]
				const downsizedWidth = 400
				const downsizedHeight = (optimisedHeight/optimisedWidth)*downsizedWidth
				try {
					const masterName = photo.originalName
					const masterObject = await this.storage.getPhoto(masterName)
					if(photo.parentCollection === 'films' && photo.type === 'poster'){

						

					} else if(photo.parentCollection === 'films' && photo.type === 'still'){

					} else if(photo.parentCollection === 'people'){

					} else if(photo.parentCollection === 'companies'){

					} else if(photo.parentCollection === 'users'){

					} else if(photo.parentCollection === 'content'){

					}
				} catch (err: any) {
					console.log(`Error on image: ${photo.id}: ${err.message}`)
					continue
				}
			}
		} catch (err: any) {
			
		}
	}
}
