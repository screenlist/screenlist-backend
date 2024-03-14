import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { CompaniesService } from 'src/companies/companies.service';
import { ContentService } from 'src/content/content.service';
import { DatabaseService } from 'src/database/database.service';
import { FilmsService } from 'src/films/films.service';
import { UsersService } from 'src/users/users.service';
import { Datastore } from '@google-cloud/datastore'
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { Request, UserExt } from 'src/users/users.types';
import { Person } from 'src/people/people.types';
import { CollectionFields } from 'src/database/database.types';
import { Film, Photo } from 'src/films/films.types';
import { Company, Role } from 'src/companies/companies.types';
import { Content } from 'src/content/content.types';
import { Storage } from '@google-cloud/storage';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class HistoryService {
	constructor(
		private auth: AuthService,
		private mongo: DatabaseService,
		private config: ConfigService,
		private blaze: StorageService
	){}

	private datastore = new Datastore()
	private storage = new Storage()

	async getNewUserId(oldId: string){
		try {
			const records = await this.auth.client.users.getUserList()
			const record = records.find(val => val.externalId === oldId)
			return record.id
		} catch(err: any){
			console.log(err.message)
		}
	}

	async moveUsers(){
		try {
			const records = await this.auth.client.users.getUserList()
			const [users] = await this.datastore.createQuery('User').run()

			await Promise.all(
				users.map(async item => {
					const record = records.find(val => val.externalId === item[this.datastore.KEY]['name'])
					await this.auth.client.users.updateUser(record.id, {
						username: item.userName
					})
					const user: UserExt = {
						id: record.id,
						username:item.userName.toLowerCase().replace(/[^0-9a-z]/gi, ''),
						fullName: `${record.firstName} ${record.lastName}`,
						role: item.role,
						reputation: 0,
						favouriteFilms: [],
						created: new Date(item.created),
						lastUpdated: new Date(item.lastUpdated)
					}

					await this.mongo.insertOne(user, 'users')
				})
			)
		} catch(err: any){
			console.log(err.message)
		}
	}

	async moveRequests(){
		try {
			const [old] = await this.datastore.createQuery('Request').run()
			await Promise.all(
				old.map(async item => {
					const req: Request = {
						id: await this.mongo.generateUniqueId('requests', 12),
						request: item.request,
						requestSubject: item.requestSubject,
						notes: item.notes,
						approved: item.approved ? item.approved : false,
						acknowledged: item.acknowledged ? item.acknowledged : false,
						createdBy: await this.getNewUserId(item.createdBy),
						created: new Date(item.created),
						lastUpdated: new Date(item.lastUpdated)
					}
					await this.mongo.insertOne(req, 'requests')
				})
			)
		} catch(err: any){
			console.log(err.message)
		}
	}

	async mega(){
		console.log('****************MIGRATION STARTING****************')
		const peopleFields: CollectionFields<Person> = [ 
			'id', 'name',	'occupation', 'cityOfOrigin', 'provinceOfOrigin',
			'countryOfOrigin', 'yearOfBirth', 'dateMonthOfBirth',
			'deathDate', 'nationality', 'gender', 'pronouns',
			'twitterUsername', 'instagramUsername', 'description',
			'website', 'editVerified', 'isHidden', 'editLocked',
			'lastVerified', 'created', 'lastUpdated'
		]

		const companyFields: CollectionFields<Company> = [
			'id', 'name', 'founded', 'dateMonthFounded', 'city',
			'country', 'director', 'founder', 'foundingPlace', 'description',
			'website', 'editVerified', 'isHidden', 'editLocked', 'lastVerified',
			'created', 'lastUpdated'
		]

		const roleFields: CollectionFields<Role> = [
			'id', 'parentCollection', 'parentName', 'parentId',
			'ownerName', 'ownerCollection', 'ownerId', 'role',
			'department', 'category', 'characterName', 'lastUpdated',
			'created'
		]

		const filmFields: CollectionFields<Film> = [
			'id', 'name', 'year', 'trailerUrl', 'type', 'format',
			'productionStage', 'runtime', 'boxOffice', 'budget',
			'logline', 'plotSummary', 'releaseDate', 'initialPlatform',
			'countries', 'languages', 'additionalLanguages', 'genres',
			'listRatings', 'listScore', 'hasPoster', 'isHidden', 'editVerified',
			'editLocked', 'lastVerified', 'lastUpdated', 'created'
		]
		
		try {
			console.log('****************MIGRATION STARTING****************')
			await this.moveUsers()
			console.log('USERS CREATED')
			await this.moveRequests()
			console.log('REQUESTS MOVED')

			let [oldPeople] = await this.datastore.createQuery('Person').run()
			let [oldCompanies] = await this.datastore.createQuery('Company').run()
			let [oldFilms] = await this.datastore.createQuery('Film').run()
			let [oldPersonRoles] = await this.datastore.createQuery('PersonRole').run()
			let [oldPersonPhotos] = await this.datastore.createQuery('PersonPhoto').run()
			let [oldCompanyRoles] = await this.datastore.createQuery('CompanyRole').run()
			let [oldCompanyPhotos] = await this.datastore.createQuery('CompanyPhoto').run()
			let [oldPosters] = await this.datastore.createQuery('Poster').run()
			let [oldStills] = await this.datastore.createQuery('Still').run()
			let [oldContent] = await this.datastore.createQuery('Content').run()
			const [oldUsers] = await this.datastore.createQuery('User').run()

			oldContent = await Promise.all(
				oldContent.map(async item => {
					try {
						const oldUser = oldUsers.find(val => val.userName = item.author)
						const newAuthorId = await this.getNewUserId(oldUser[this.datastore.KEY]['name'])
						console.log(newAuthorId)
						const user = await this.auth.client.users.getUser(newAuthorId)

						const document: Content = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							authorId: newAuthorId,
							authorName: `${user.firstName} ${user.lastName}`,
							headline: item.headline,
							summary: item.summary,
							body: item.body,
							tags: item.tags.split(','),
							slug: item.slug,
							type: item.type
						}

						await this.mongo.insertOne<Content>(document, 'content')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in Content: "+err.message)
					}
				})
			)
			console.log('CONTENT MOVED')

			oldPeople = await Promise.all(
				oldPeople.map(async item => {
					try {
						const person: Person = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							isHidden: item.isHidden ? item.isHidden : false,
							lastVerified: item.lastVerified ? item.lastVerified : new Date(item.created),
							editLocked: item.editLocked ? item.editLocked : false,
							editVerified: item.editVerified ? item.editVerified : false,
							occupation: item.occupation,
							name: item.name,
						}
						
						for(const key in item){
							if(peopleFields.includes(key as any) && !person.hasOwnProperty(key)){
								person[key] = item[key]
							}
						}
						await this.mongo.insertOne<Person>(person, 'people')
						return {...item, xNewId: person.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in People: "+err.message)
					}					
				})
			)
			console.log('PEOPLE MOVED')

			oldCompanies = await Promise.all(
				oldCompanies.map(async item => {
					try {
						const document: Company = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							isHidden: item.isHidden ? item.isHidden : false,
							lastVerified: item.lastVerified ? item.lastVerified : new Date(item.created),
							editLocked: item.editLocked ? item.editLocked : false,
							editVerified: item.editVerified ? item.editVerified : false,
							name: item.name
						}

						for(const key in item){
							if(companyFields.includes(key as any) && !document.hasOwnProperty(key)){
								document[key] = item[key]
							}
						}
						await this.mongo.insertOne<Company>(document, 'companies')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in Companies: "+err.message)
					}					
				})
			)
			console.log('COMPANIES MOVED')

			oldFilms = await Promise.all(
				oldFilms.map(async item => {
					try {
						const document: Film = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							isHidden: item.isHidden ? item.isHidden : false,
							lastVerified: item.lastVerified ? item.lastVerified : new Date(item.created),
							editLocked: item.editLocked ? item.editLocked : false,
							editVerified: item.editVerified ? item.editVerified : false,
							name: item.name,
							year: item.year,
							format: item.format,
							productionStage: item.productionStage,
							logline: item.logline,
							genres: item.genres,
							listRatings: item.listRatings ? item.listRatings : 0,
							listScore: item.listScore ? item.listScore : 0,
							hasPoster: item.hasPoster ? item.hasPoster : false,
							type: item.type
						}

						for(const key in item){
							if(filmFields.includes(key as any) && !document.hasOwnProperty(key)){
								document[key] = item[key]
							}
						}
						await this.mongo.insertOne<Film>(document, 'films')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in Films: "+err.message)
					}					
				})
			)
			console.log('FILMS MOVED')
			
			// Person Roles
			await Promise.all(
				oldPersonRoles.map(async item => {
					try {
						const person = oldPeople.find(val => val.xOldId === item.personId)
						const film = oldFilms.find(val => val.xOldId === item.ownerId)

						const document: Role = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							parentCollection: 'people',
							parentName: person.name,
							parentId: person.xNewId,
							ownerCollection: 'films',
							ownerName: film.name,
							ownerId: film.xNewId,
							role: item.title
						}

						for(const key in item){
							if(roleFields.includes(key as any) && !document.hasOwnProperty(key)){
								document[key] = item[key]
							}
						}

						await this.mongo.insertOne<Role>(document, 'roles')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in People Roles: "+err.message)
					}
					
				})
			)
			console.log('PEOPLE ROLES MOVED')

			// Company Roles
			await Promise.all(
				oldCompanyRoles.map(async item => {
					try {
						const company = oldCompanies.find(val => val.xOldId === item.companyId)
						const film = oldFilms.find(val => val.xOldId === item.ownerId)
						

						const document: Role = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							parentCollection: 'companies',
							parentName: company.name,
							parentId: company.xNewId,
							ownerCollection: 'films',
							ownerName: film.name,
							ownerId: film.xNewId,
							role: item.capacity
						}

						for(const key in item){
							if(roleFields.includes(key as any) && !document.hasOwnProperty(key)){
								document[key] = item[key]
							}
						}

						await this.mongo.insertOne<Role>(document, 'roles')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in Companies Roles: "+err.message)
					}
					
				})
			)
			console.log('COMPANIES ROLES MOVED')

			// Still Photos
			await Promise.all(
				oldStills.map(async item => {
					try {
						let parentId;

						const path = item[this.datastore.KEY]['path']
						if(path.length === 4){
							parentId = path[path.length - 3]
						} else if(item.film){
							parentId = item.film[this.datastore.KEY]['id']
						} else {
							parentId = item.parentId
						}
						console.log(parentId)
						const film = oldFilms.find(val => val.xOldId === parentId)

						const document: Photo = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							parentId: film.xNewId,
							parentCollection: 'films',
							photoIndex: +item.stillIndex,
							originalDimensions: item.originalDimensions,
							originalName: item.originalName,
							originalSize: item.originalSize,
							originalUrl: item.originalUrl,
							optimisedDimensions: item.hdDimensions,
							optimisedName: item.hdName,
							optimisedSize: item.hdSize,
							optimisedUrl: item.hdUrl,
							uploadedByUser: 'admin',
							type: 'still'
						}

						for(const key in item){
							if(key === 'attribution' || key === 'description'){
								document[key] = item[key]
							}
						}

						await this.mongo.insertOne<Photo>(document, 'photos')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in Stills: "+err.message)
					}					
				})
			)
			console.log('STILLS MOVED')

			// Poster Photos
			await Promise.all(
				oldPosters.map(async item => {
					try {
						let parentId;

						const path = item[this.datastore.KEY]['path']
						if(path.length === 4){
							parentId = path[path.length - 3]
						} else if(item.film){
							parentId = item.film[this.datastore.KEY]['id']
						} else {
							parentId = item.parentId
						}
						console.log(parentId)
						const film = oldFilms.find(val => val.xOldId === parentId)

						const document: Photo = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							parentId: film.xNewId,
							parentCollection: 'films',
							photoIndex: +item.posterIndex,
							originalDimensions: item.originalDimensions,
							originalName: item.originalName,
							originalSize: item.originalSize,
							originalUrl: item.originalUrl,
							optimisedDimensions: item.hdDimensions,
							optimisedName: item.hdName,
							optimisedSize: item.hdSize,
							optimisedUrl: item.hdUrl,
							uploadedByUser: 'admin',
							type: 'poster'
						}

						for(const key in item){
							if(key === 'attribution' || key === 'description'){
								document[key] = item[key]
							}
						}

						await this.mongo.insertOne<Photo>(document, 'photos')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in Posters: "+err.message)
					}					
				})
			)
			console.log('POSTERS MOVED')

			// People Photos
			await Promise.all(
				oldPersonPhotos.map(async item => {
					try {
						let parentId;

						const path = item[this.datastore.KEY]['path']
						if(path.length === 4){
							parentId = path[path.length - 3]
						} else if(item.person){
							parentId = item.person[this.datastore.KEY]['id']
						} else {
							parentId = item.parentId
						}
						console.log(parentId)
						const person = oldPeople.find(val => val.xOldId === parentId)

						const document: Photo = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							parentId: person.xNewId,
							parentCollection: 'films',
							photoIndex: +item.photoIndex,
							originalDimensions: item.originalDimensions,
							originalName: item.originalName,
							originalSize: item.originalSize,
							originalUrl: item.originalUrl,
							optimisedDimensions: item.hdDimensions,
							optimisedName: item.hdName,
							optimisedSize: item.hdSize,
							optimisedUrl: item.hdUrl,
							uploadedByUser: 'admin',
							type: 'image'
						}

						for(const key in item){
							if(key === 'attribution' || key === 'description'){
								document[key] = item[key]
							}
						}

						await this.mongo.insertOne<Photo>(document, 'photos')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in People Photos: "+err.message)
					}
					
				})
			)
			console.log('PEOPLE PHOTOS MOVED')

			await Promise.all(
				oldCompanyPhotos.map(async item => {
					try {
						let parentId;

						const path = item[this.datastore.KEY]['path']
						if(path.length === 4){
							parentId = path[path.length - 3]
						} else if(item.company){
							parentId = item.company[this.datastore.KEY]['id']
						} else {
							parentId = item.parentId
						}
						console.log(parentId)
						const company = oldCompanies.find(val => val.xOldId === parentId)

						const document: Photo = {
							id: await this.mongo.generateUniqueId('requests', 12),
							created: new Date(item.created),
							lastUpdated: new Date(item.lastUpdated),
							parentId: company.xNewId,
							parentCollection: 'films',
							photoIndex: +item.photoIndex,
							originalDimensions: item.originalDimensions,
							originalName: item.originalName,
							originalSize: item.originalSize,
							originalUrl: item.originalUrl,
							optimisedDimensions: item.hdDimensions,
							optimisedName: item.hdName,
							optimisedSize: item.hdSize,
							optimisedUrl: item.hdUrl,
							uploadedByUser: 'admin',
							type: 'image'
						}

						for(const key in item){
							if(key === 'attribution' || key === 'description'){
								document[key] = item[key]
							}
						}

						await this.mongo.insertOne<Photo>(document, 'photos')
						return {...item, xNewId: document.id, xOldId: item[this.datastore.KEY]['id']}
					} catch(err: any){
						console.log("Error in Companies Photos: "+err.message)
					}
					
				})
			)
			console.log('COMPANIES PHOTOS MOVED')
			console.log('****************MIGRATION COMPLETE****************')

		} catch(err: any){
			console.log('-----------------'+err.message)
		}
	}

	async transferImages(){
		try {
			console.log(`***********IMAGE MIGRATION STARTING***************`)
			const bucket = this.storage.bucket(this.config.get('STORAGE_IMAGES'))
			const photos = await this.mongo.db.collection<Photo>('photos').find({}).toArray()
			for await (const photo of photos){
				try {
					const original = await bucket.file(photo.originalName).download()
					const originalMeta = await bucket.file(photo.originalName).getMetadata()
					const origin = await this.blaze.plainUpload(original[0], originalMeta[0].contentType, photo.originalName)
					console.log(`Uploaded ${photo.originalName}: ${origin.url}`)

					const optimised = await bucket.file(photo.optimisedName).download()
					const optimisedMeta = await bucket.file(photo.optimisedName).getMetadata()
					const optimise = await this.blaze.plainUpload(optimised[0], optimisedMeta[0].contentType, photo.optimisedName)
					console.log(`Uploaded ${photo.optimisedName}: ${optimise.url}`)
					
					photo.originalUrl = origin.url
					photo.optimisedUrl = optimise.url
					photo.lastUpdated = new Date()

					await this.mongo.updateOne<Photo>(photo, 'photos')
					console.log(`Update complete for ${photo.id}`)
				} catch(err: any){
					// console.log(err.message)
					console.log(`Error uploading ${photo.type} ${photo.id}: ${err.message}`)
					continue
				}
			}
			console.log(`******************MIGRATION COMPLETE*******************`)
		} catch(err: any){
			console.log(err.message)
			throw new BadRequestException()
		}
	}
}
