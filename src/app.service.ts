import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException, StreamableFile } from '@nestjs/common';
import axios from 'axios';
import fetch from 'cross-fetch';
import { DatabaseService } from './database/database.service';
import { SearchService } from './search/search.service';
import { HistoryService } from './history/history.service';
import { StorageService } from './storage/storage.service';
import { Photo } from './films/films.types';
import { AuthService } from './auth/auth.service';
import { UserExt } from './users/users.types';
import { User } from '@clerk/backend';
import { UsersService } from './users/users.service';

@Injectable()
export class AppService {
	constructor(
		private mongo: DatabaseService,
		private search: SearchService,
		private history: HistoryService,
		private storage: StorageService,
		private auth: AuthService,
		private users: UsersService
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
			// await this.reOptimiseImages()
			await this.databaseRecovery()
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
				const photoNumber = photos.indexOf(photo)							
				try {
					console.log(`+ Processing photo id ${photo.id} of ${photo.parentCollection}:`)	
					const originalDimensions = [ Number(photo.originalDimensions.split('x')[0]), Number(photo.originalDimensions.split('x')[1]) ]
					const optimisedDimensions = [ Number(photo.optimisedDimensions.split('x')[0]), Number(photo.optimisedDimensions.split('x')[1]) ]
					const downsizedDimensions = [ 400, Math.round((optimisedDimensions[1]/optimisedDimensions[0])*400) ]
					console.log('original dimensions', originalDimensions)
					console.log('optimised dimesions', optimisedDimensions)
					console.log('downsized dimensions', downsizedDimensions)
					const masterName = photo.originalName
					const optimisedName = photo.optimisedName
					const downsizedName = photo.downsizedName ? photo.downsizedName : masterName+'dwnszd'

					const masterObject = await this.storage.getPhoto(masterName)
					if(photo.parentCollection !== 'companies'){

						// Original
						if(photo.originalName){
							await this.storage.deletePhoto(photo.originalName)
						}

						const original = await this.storage.fileUploader(
							originalDimensions[0], 
							originalDimensions[1], 
							masterObject.buffer, 
							masterObject.type, 
							masterName, 
							true, 
							false
						)

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 30%`)

						photo.originalName = original.name
						photo.originalDimensions = original.dimensions
						photo.originalSize = original.size
						photo.originalUrl = original.url

						// Optimised
						if(photo.optimisedName){
							await this.storage.deletePhoto(photo.optimisedName)
						}

						const optimised = await this.storage.fileUploader(
							optimisedDimensions[0], 
							optimisedDimensions[1], 
							masterObject.buffer, 
							masterObject.type, 
							optimisedName, 
							false, 
							false
						)

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 60%`)

						photo.optimisedName = optimised.name
						photo.optimisedDimensions = optimised.dimensions
						photo.optimisedSize = optimised.size
						photo.optimisedUrl = optimised.url

						// Downsized
						if(photo.downsizedName){
							await this.storage.deletePhoto(photo.downsizedName)
						}

						const downsized = await this.storage.fileUploader(
							downsizedDimensions[0], 
							downsizedDimensions[1], 
							masterObject.buffer, 
							masterObject.type, 
							downsizedName, 
							false, 
							false
						)

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 90%`)

						photo.downsizedName = downsized.name
						photo.downsizedDimensions = downsized.dimensions
						photo.downsizedSize = downsized.size
						photo.downsizedUrl = downsized.url

						await this.mongo.updateOne<Photo>(photo, 'photos')

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 100%`)

					} else if(photo.parentCollection === 'companies'){

						// Original
						if(photo.originalName){
							await this.storage.deletePhoto(photo.originalName)
						}

						const original = await this.storage.fileUploader(
							originalDimensions[0], 
							originalDimensions[1], 
							masterObject.buffer, 
							masterObject.type, 
							masterName, 
							true, 
							false
						)

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 30%`)

						photo.originalName = original.name
						photo.originalDimensions = original.dimensions
						photo.originalSize = original.size
						photo.originalUrl = original.url

						// Optimised
						if(photo.optimisedName){
							await this.storage.deletePhoto(photo.optimisedName)
						}

						const optimised = await this.storage.fileUploader(
							optimisedDimensions[0], 
							optimisedDimensions[1], 
							masterObject.buffer, 
							masterObject.type, 
							optimisedName, 
							false, 
							true
						)

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 60%`)

						photo.optimisedName = optimised.name
						photo.optimisedDimensions = optimised.dimensions
						photo.optimisedSize = optimised.size
						photo.optimisedUrl = optimised.url

						// Downsized
						if(photo.downsizedName){
							await this.storage.deletePhoto(photo.downsizedName)
						}

						const downsized = await this.storage.fileUploader(
							downsizedDimensions[0], 
							downsizedDimensions[1], 
							masterObject.buffer, 
							masterObject.type, 
							downsizedName, 
							false, 
							true
						)

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 90%`)

						photo.downsizedName = downsized.name
						photo.downsizedDimensions = downsized.dimensions
						photo.downsizedSize = downsized.size
						photo.downsizedUrl = downsized.url

						await this.mongo.updateOne<Photo>(photo, 'photos')

						console.log(`>>> Photo id ${photo.id} of ${photo.parentCollection} - 100%`)

					} else { console.log(`Photo id ${photo.id} of ${photo.parentCollection} was NOT PROCESSED`) }

					console.log(`**** ${photoNumber+1}/${photos.length} ---- ${Math.round(((photoNumber+1)/photos.length)*100)}% COMPLETE ****`)
				} catch (err: any) {
					console.log(photo)
					console.log(`>>> Error on image: ${photo.id} of ${photo.parentCollection}: ${err.message}`)
					continue
				}
			}
			console.log('******************OPTIMISATION COMPLETE**********************')
		} catch (err: any) {
			console.log(`Function Error: ${err.message}`)
			console.log('******************OPTIMISATION EXITED**********************')
		}
	}

	async databaseRecovery() {
		console.log('****USER RECOVERY BEGINS****')
		try {
			const totalDBUsers = await this.mongo.db.collection<UserExt>('users').countDocuments()
			const totalAuthUsers = await this.auth.client.users.getCount()

			if(totalAuthUsers !== totalDBUsers) {

				const getAuthUsers = async () => {
					const size = 400
					const retrieved: User[] = []

					while(totalAuthUsers > retrieved.length){
						try {
							const getUsers = (await this.auth.client.users.getUserList({limit: size, offset: retrieved.length})).data
							retrieved.push(...getUsers)
						} catch (err) {
							console.log(err.message)
							continue
						}
					}

					return retrieved.sort((a, b) => a.createdAt - b.createdAt)
				}

				const authUsers = await getAuthUsers()
				 
				await Promise.all(
					authUsers.map(async (user, index) => {
						try {
							const doesUserExist = (await this.mongo.db.collection<UserExt>('users').countDocuments({id: user.id})) > 0
							const role = totalDBUsers === 0 && index === 0 ? 'admin' : 'member'
							if(doesUserExist === false){ 
								await this.users.createUser(user.id, role) 
								console.log(`${user.fullName} - ${user.id} was processed`)
							}
							console.log(`${user.fullName} - ${user.id} already exists`)
						} catch(err) {
							console.log(`Could not process user ${user.fullName} - ${user.id}: ${err.message}`)
						}
					})
				)

			}
			
		} catch (err) {
			throw new BadRequestException(err.message)
		}
		console.log('****USER RECOVERY ENDS****')
	}
}
