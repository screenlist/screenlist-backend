import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
	CreatePersonDto,
	UpdatePersonDto,
	CreatePersonRoleDto,
	UpdatePersonRoleDto
} from './people.dto';
import {
	Person,
	PersonOpt,
	PersonRoleOpt
} from './people.types';
import { CollectionFields, EditsMetadata, HistoryOpt, HistoryX } from '../database/database.types';
import { StorageService } from '../storage/storage.service';
import { PhotoDto } from '../films/films.dto';
import { Film, ImageOpt, Photo } from  '../films/films.types';
import { SearchService } from 'src/search/search.service';
import { Role } from 'src/companies/companies.types';
import { FilmSchema, PersonSchema } from 'src/search/search.types';
import { UserExt } from 'src/users/users.types';

@Injectable()
export class PeopleService {
	constructor(
		private storage: StorageService,
		private mongo: DatabaseService,
		private search: SearchService
	){}

	async findAll(page?: number, limit?: number) {
		const	size = limit ? +limit : 50
		const skip = ( (page ? +page : 1) - 1 ) * size

		const query =  this.mongo.db.collection<Person>('people').find({
			editVerified: true
		}).sort({'lastUpdated': -1}).skip(skip).limit(size)

		try {
			const total = await this.mongo.db.collection<Person>('people').countDocuments({
				editVerified: true,
				isHidden: false
			})
			const totalPages = Math.ceil(total/size)
			const people = await query.toArray()
			const data = await Promise.all(
				people.map(async (item) => {
					const photo = await this.mongo.db.collection<Photo>('photos').findOne({
						parentCollection: 'people',
						parentId: item.id,
						photoIndex: 0,
						type: 'image'
					})
					return {
						...item,
						photo: photo ? {
							url: photo.optimisedUrl,
							index: photo.photoIndex,
							credit: photo.attribution,
							altText: photo.description
						} : null
					}
				})
			)
			return {
				data,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1 
			}
		} catch(err: any) {
			// console.log(err)
			throw new NotFoundException('Could not find people')
		}
	}

	async findAllUnverified() {
		try{
			let people = await this.mongo.db.collection<Person>('people').find({
				editVerified: false,
			}).sort({'lastUpdated': 1}).limit(50).toArray()

			return people;
		} catch {
			throw new NotFoundException('Could not retrieve people');
		}
	}

	async findAllHidden() {
		try{
			let people = await this.mongo.db.collection<Person>('people').find({
				isHidden: true
			}).sort({'lastUpdated': 1}).toArray()

			return people;
		} catch {
			throw new NotFoundException('Could not retrieve people');
		}
	}

	async findOne(id: string, userId?: string) {
		try {
			const person = await this.mongo.db.collection<Person>('people').findOne({ id: id })
			if(!person){throw new NotFoundException('Not found')}

			// Never permit the less privileged access hidden people
			if(person.isHidden && userId){
				const userExt = await this.mongo.db.collection<UserExt>('users').findOne({id: userId})
				if(userExt.role === 'member' || userExt.role === 'journalist'){ throw new ForbiddenException('This resource is strictly restricted') }
			} else if(person.isHidden && !userId){ throw new ForbiddenException('This resource is strictly restricted') }

			const photo = await this.mongo.db.collection<Photo>('photos').findOne({ parentId: id, photoIndex: 0, parentCollection: 'people', type: 'image'})
			const details = {
				...person,
				photo: photo ? {
					url: photo.optimisedUrl,
					index: photo.photoIndex,
					credit: photo.attribution,
					altText: photo.description
				} : null
			}

			const partialRoles = await this.mongo.db.collection<Role>('roles').find({parentCollection: 'people', parentId: id}).toArray()
			const filmography = [];

			await Promise.all(
				partialRoles.map(async (item) => {
					try {
						const owner = await this.mongo.db.collection<Film>('films').findOne({id: item.ownerId})
						const poster = await this.mongo.db.collection<Photo>('photos').findOne({type: 'poster', parentId: item.ownerId, photoIndex: 0, parentCollection: 'films'})
						const path = `/${item.ownerCollection == 'films' ? 'films' : 'series'}/${item.ownerId}/people/${item.parentId}/roles/${item.id}`;

						const role = {...item, urlPath: path}
						
						const work = filmography.find((element) => element.id == item.ownerId);

						if(work){
							work.roles.push(role)
						} else {
							const parentObject = {
								name: item.ownerName,
								id: item.ownerId,
								type: item.ownerCollection,
								year: owner.year,
								posterUrl: poster?.optimisedUrl,
								roles: [role]
							}
							filmography.push(parentObject)
						}

						return {
							...item,
							ownerName: owner.name,
							posterUrl: poster?.optimisedUrl,
							year: owner.year
						}
					} catch (err: any) {
						throw new BadRequestException(err.message)
					}
				})
			)

			filmography.sort((a, b) => {
				if(a.year > b.year) {
					return -1
				} else {
					return 0
				}
			});

			// console.log(filmography.length, partialRoles.length)
			// console.log(details)
			return {
				details,
				filmography
			}
		} catch(err) {
			throw new NotFoundException("Person not found")
		}
	}

	async findOneDetailsOnly(id: string){
		try {
			return await this.mongo.db.collection<Person>('people').findOne({id: id})
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createOne(data: CreatePersonDto, opt: PersonOpt){

		try {
			const entity: Person = {
				id: await this.mongo.generateUniqueId('people', 12),
				...data,
				editVerified: false,
				lastVerified: opt.time,
				isHidden: false,
				editLocked: false,
				created: opt.time,
				lastUpdated: opt.time
			}

			await this.mongo.insertOne(entity, 'people');

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'people',
				id: entity.id,
				action: 'create',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			const searchRecord: PersonSchema = {
				id: entity.id,
				name: entity.name,
				occupation: entity.occupation,
				yearOfBirth: entity.yearOfBirth,
				cityOfOrigin: entity.cityOfOrigin,
				provinceOfOrigin: entity.provinceOfOrigin,
				gender: entity.gender,
				pronouns: entity.pronouns,
				description: entity.description,
				countryOfOrigin: entity.countryOfOrigin,
				nationality: entity.nationality,
				deathDate: this.mongo.dateToBigInt(entity.deathDate),
				created: this.mongo.dateToBigInt(entity.created),
				lastUpdated: this.mongo.dateToBigInt(entity.lastUpdated),
				dateMonthOfBirth: this.mongo.dateToBigInt(entity.dateMonthOfBirth)
			}
			await this.search.client.collections('people').documents().create(searchRecord);

			return entity
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateOne(data: UpdatePersonDto, opt: PersonOpt, remove?: CollectionFields<Person>){
		if(!Array.isArray(remove)){ throw new BadRequestException('Provide an array for properties to remove') }

		try {
			const entity = await this.mongo.db.collection<Person>('people').findOne({id: opt.personId})
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			if(entity.editLocked === true){ throw new BadRequestException("Edit locked") }

			for (const key in data) {
				entity[key] = data[key]
			}

			entity.lastUpdated = opt.time
			entity.editVerified = false

			const updated = await this.mongo.updateOne<Person>(entity, 'people', remove)

			const dataAfter = {...updated};
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'people',
				id: entity.id,
				action: 'update',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			// If the name has been updated, update all its roles
			if(data.hasOwnProperty('name')){
				await this.mongo.db.collection<Role>('roles').updateMany({parentName: dataBefore.name, parentCollection: 'people', parentId: updated.id}, {
					$set: { parentName: updated.name }
				})
			}

			const searchRecord: Partial<PersonSchema> = {
				name: updated.name,
				occupation: updated.occupation,
				yearOfBirth: updated.yearOfBirth,
				cityOfOrigin: updated.cityOfOrigin,
				provinceOfOrigin: updated.provinceOfOrigin,
				gender: updated.gender,
				pronouns: updated.pronouns,
				description: updated.description,
				countryOfOrigin: updated.countryOfOrigin,
				nationality: updated.nationality,
				deathDate: this.mongo.dateToBigInt(updated.deathDate),
				lastUpdated: this.mongo.dateToBigInt(updated.lastUpdated)
			}
			await this.search.client.collections('people').documents(entity.id).update(searchRecord);

			if(entity.name !== updated.name){
				await this.mongo.db.collection<Role>('roles').updateMany({
					parentCollection: 'people',
					parentId: updated.id
				}, { $set: { parentName: updated.name } })
			}

			return updated
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: PersonOpt){
		try {
			const roles = await this.mongo.db.collection<Role>('roles').find({parentCollection: 'people', parentId: opt.personId}).toArray();
			const person = await this.mongo.db.collection<Person>('people').findOne({id: opt.personId});
			const historyObj: HistoryOpt = {
				dataObject: person,
				kind: 'people',
				id: person.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			await this.mongo.createHistory(historyObj);

			await Promise.all(
				roles.map(async (role) => {
					const roleHistoryObj: HistoryOpt = {
						dataObject: role,
						kind: 'roles',
						id: role.id,
						time: opt.time,
						action: 'delete',
						user: opt.user,
						pId: opt.personId,
						pKind: 'people'
					}
					await this.mongo.createHistory(roleHistoryObj);
				})
			)
			
			await this.search.client.collections('people').documents(person.id).delete();
			await this.mongo.db.collection<Role>('roles').deleteMany({parentCollection: 'people', parentId: opt.personId});
			await this.mongo.db.collection<Person>('people').deleteOne({id: opt.personId});
			return { 'status': 'successfully deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			if(opt.index !== 0){ throw new BadRequestException('Unknown index') }

			const existing = await this.mongo.db.collection<Photo>('photos').countDocuments({parentCollection: 'people', parentId: opt.parentId, type: 'image', photoIndex: opt.index})
			if(existing > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}

			const data = await this.storage.uploadProfilePhoto(image)
			const photo: Photo = { 
				id: await this.mongo.generateUniqueId('photos', 12),
				...data,
				parentCollection: 'people',
				parentId: opt.parentId,
				lastUpdated: opt.time,
				created: opt.time,
				photoIndex: opt.index,
				type: 'image',
				uploadedByUser: opt.user
			}
			await this.mongo.insertOne(photo, 'photos')

			// Alert data change to the parent
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'people');

			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'photos',
				id: photo.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const searchRecord: Partial<PersonSchema> = {
				photoUrl: data.optimisedUrl
			}
			await this.search.client.collections('people').documents(opt.parentId).update(searchRecord);
			await this.mongo.createHistory(historyObj);

			return photo
		} catch(err: any) {
			throw new BadRequestException()
		}
	}

	async updatePhoto(data: PhotoDto , opt: ImageOpt){
		try {
			const entity = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'people',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			})
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				entity[key] = data[key]
			}

			entity.lastUpdated = opt.time

			const dataAfter = {...entity};
			await this.mongo.updateOne(entity, 'photos');

			// Alert data change to the parent entity
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'people');

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'photos',
				id: entity.id,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);

			return entity
		} catch(err: any) {
			throw new BadRequestException()
		}
	}

	async removePhoto(opt: ImageOpt){
		try{
			const photo = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'people',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			})

			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'photos',
				id: photo.id,
				action: 'delete',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.storage.deletePhoto(photo.originalName);
			await this.storage.deletePhoto(photo.optimisedName);
			await this.storage.deletePhoto(photo.downsizedName);
			await this.mongo.createHistory(historyObj);
			await this.mongo.db.collection<Photo>('photos').deleteOne({
				parentCollection: 'people',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			});

			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'people');

			const searchRecord: Partial<PersonSchema> = {
				photoUrl: null
			}
			await this.search.client.collections('people').documents(opt.parentId).update(searchRecord);

			return {'status': 'deleted'}
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async createOneRole(data: CreatePersonRoleDto, opt: PersonRoleOpt){
		if(!data.category){
			throw new BadRequestException('role category not specified')
		}

		try {
			const film = await this.mongo.db.collection<Film>('films').findOne({id: opt.parentId})

			const role: Role = {
				id: await this.mongo.generateUniqueId('roles', 12),
				parentCollection: 'people',
				parentId: opt.personId,
				parentName: data.personName,
				ownerName: film.name,
				ownerCollection: 'films',
				ownerId: film.id,
				role: data.title,
				department: data.department,
				category: data.category as Role['category'],
				lastUpdated: opt.time,
				created: opt.time,
				characterName: data.characterName ? data.characterName : null
			}
			await this.mongo.insertOne(role, 'roles');

			// Alert data change to the parent entity
			film.editVerified = false
			film.lastUpdated = opt.time
			await this.mongo.updateOne(film, 'films')

			// Update search
			if(data.title === 'Director'){
				const directors = await this.mongo.db.collection<Role>('roles').find({
					ownerCollection: 'films',
					ownerId: film.id,
					parentCollection: 'people',
					role: 'Director'
				}).toArray()
				const directorNames = directors.map(val => val.parentName);
				const searchRecord: Partial<FilmSchema> = {
					directors: directorNames
				}
				await this.search.client.collections('films').documents(opt.parentId).update(searchRecord);
			}
			

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: role,
				user: opt.user,
				kind: 'roles',
				id: role.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);

			return role
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdatePersonRoleDto, opt: PersonRoleOpt){

		try {
			const entity = await this.mongo.db.collection<Role>('roles').findOne({id: opt.roleId})
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				entity[key] = data[key]
			}

			entity.lastUpdated = opt.time

			const dataAfter = {...entity};
			await this.mongo.updateOne(entity, 'roles');

			// Alert data change to the parent entity
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'films');


			// Update search
			if(data.title === 'Director'){
				const directors = await this.mongo.db.collection<Role>('roles').find({
					ownerCollection: 'films',
					ownerId: entity.ownerId,
					parentCollection: 'people',
					role: 'Director'
				}).toArray()
				const directorNames = directors.map(val => val.parentName);

				const searchRecord: Partial<FilmSchema> = {
					directors: directorNames
				}

				await this.search.client.collections('films').documents(opt.parentId).update(searchRecord);
			}

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'roles',
				id: entity.id,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);

			return entity
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deleteOneRole(opt: PersonRoleOpt){
		
		try {
			const role = await this.mongo.db.collection<Role>('roles').findOne({id: opt.roleId})
			const historyObj: HistoryOpt = {
				dataObject: role,
				kind: 'roles',
				id: role.id,
				time: opt.time,
				action: 'delete',
				user: opt.user,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);
			await this.mongo.db.collection<Role>('roles').deleteOne({id: opt.roleId})

			if(role.role === 'Director'){
				const directors = await this.mongo.db.collection<Role>('roles').find({
					ownerCollection: 'films',
					ownerId: role.ownerId,
					parentCollection: 'people',
					role: 'Director'
				}).toArray()
				const directorNames = directors.map(val => val.parentName);

				const searchRecord: Partial<FilmSchema> = {
					directors: directorNames
				}

				await this.search.client.collections('films').documents(opt.parentId).update(searchRecord);
			}

			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'films');

			return { 'status': 'successfully deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}

	// Settings methods
	async verifyEdit(id: string, userId: string){
		
		try {
			const history = await this.justHistory(id)
			const reputations = this.mongo.determineUserReputation(history);
			const person = await this.mongo.db.collection<Person>('people').findOne({id: id})
			await Promise.all(
				reputations.map(async score => {
					try {
						const user = await this.mongo.db.collection<UserExt>('users').findOne({id: score[0]})
						user.reputation += score[1]
						await this.mongo.updateOne(user, 'users')
					} catch (err: any){}
				})
			)

			const previousVerificationDate = person.lastVerified
			const timeNow = new Date();

			person.editVerified = true
			person.lastUpdated = timeNow

			const entity = await this.mongo.updateOne(person, 'people');

			const edit: EditsMetadata = {
				id: await this.mongo.generateUniqueId('edits', 16),
				user: userId,
				intervalBegins: previousVerificationDate,
				intervalEnds: timeNow,
				pageId: person.id,
				pageType: 'people',
				reputations: reputations
			}

			await this.mongo.insertOne(edit, 'edits')

			return entity;
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}

	async lockFilmEdit(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				editLocked: true
			}, 'people')
			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async unlockFilmEdit(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				editLocked: false
			}, 'people')
			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async hideFilm(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				isHidden: true
			}, 'people')
			await this.search.client.collections('people').documents(id).delete()
			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async unhideFilm(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				isHidden: false
			}, 'people')

			const person = await this.mongo.db.collection<Person>('people').findOne({ id: id })

			const searchRecord: PersonSchema = {
				id: person.id,
				name: person.name,
				occupation: person.occupation,
				yearOfBirth: person.yearOfBirth,
				cityOfOrigin: person.cityOfOrigin,
				provinceOfOrigin: person.provinceOfOrigin,
				gender: person.gender,
				pronouns: person.pronouns,
				description: person.description,
				countryOfOrigin: person.countryOfOrigin,
				nationality: person.nationality,
				deathDate: this.mongo.dateToBigInt(person.deathDate),
				created: this.mongo.dateToBigInt(person.created),
				lastUpdated: this.mongo.dateToBigInt(person.lastUpdated),
				dateMonthOfBirth: this.mongo.dateToBigInt(person.dateMonthOfBirth)
			}

			const photo = await this.mongo.db.collection<Photo>('photos').findOne({ parentId: id, photoIndex: 0, parentCollection: 'people', type: 'image'})

			if(photo){ searchRecord.photoUrl = photo.optimisedUrl }
			
			await this.search.client.collections('people').documents().create(searchRecord);

			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	// History
	async justHistory(personId: string, intervalBegins?: Date, intervalEnds?: Date){
		try {
			const person = await this.mongo.db.collection<Person>('people').findOne({id: personId})
			const lastestMod = person.hasOwnProperty('lastVerified') ? new Date(person.lastVerified) : new Date(person.created)

			const begins: Date = intervalBegins ? intervalBegins : lastestMod
			const ends: Date = intervalBegins ? intervalEnds : new Date()

			const personHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xKind: 'people',
				xIdentifier: personId,
				xTimestamp: {$gte: begins, $lte: ends}
			}).sort({xTimestamp: -1}).toArray();

			const photoHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xKind: 'photos',
				wKind: 'people',
				wIdentifier: personId,
				xTimestamp: {$gte: begins, $lte: ends}
			}).sort({xTimestamp: -1}).toArray();
			
			const allHistories = [
				...personHistory, 
				...photoHistory
			];

			return allHistories
		} catch (err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async intervalHistory(verificationId: string){
		try {
			const metadata = await this.mongo.db.collection<EditsMetadata>('edits').findOne({id: verificationId})
			const history = await this.justHistory(metadata.pageId, metadata.intervalBegins, metadata.intervalEnds)
			const sortedHistory = await this.mongo.decodeHistory(history)
			return sortedHistory
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async getSnapShots(personId: string){
		try {
			return await this.mongo.db.collection<EditsMetadata>('edits').find({pageId: personId, pageType: 'people'}).limit(100).toArray()
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async findHistory(personId: string){
		try {
			const history = await this.justHistory(personId)

			const sortedHistory = await this.mongo.decodeHistory(history);
			 // console.log('Sorted history', sortedHistory)
			return sortedHistory;
		} catch (err: any) {
			throw new NotFoundException(err.message)
		}
	}
}
