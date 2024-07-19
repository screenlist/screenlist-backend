import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { 
	Film,
	ImageOpt,
	RatingOpt,
	Photo,
	Rating,
	Today
} from './films.types';
import {
	CreateFilmDto, 
	UpdateFilmDto,
	CreateListRatingDto,
	UpdateListRatingDto,
	PhotoDto
} from './films.dto';
import {
	CompanyRoleOpt,
	Role
} from '../companies/companies.types';
import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto
} from '../companies/companies.dto';
import { CompaniesService } from '../companies/companies.service';
import {
	PersonRoleOpt
} from '../people/people.types';
import { 
	CreatePersonRoleDto,
	UpdatePersonRoleDto
} from '../people/people.dto'
import { PeopleService } from '../people/people.service'
import { StorageService } from '../storage/storage.service';
import { CollectionFields, EditsMetadata, Freeze, HistoryOpt, HistoryX, Hit } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import { SearchService } from '../search/search.service';
import { UserExt } from 'src/users/users.types';
import { FilmSchema } from 'src/search/search.types';



@Injectable()
export class FilmsService {
	constructor(
		private mongo: DatabaseService,
		private storage: StorageService,
		private search: SearchService,
		private authService: AuthService,
		private peopleService: PeopleService,
		private companiesService: CompaniesService
	){}

	async findAll(page?: number, limit?: number) {
		const	size = limit ? +limit : 50
		const skip = ( (page ? +page : 1) - 1 ) * size
		
		let query = this.mongo.db.collection<Film>('films').find({
			editVerified: true,
			isHidden: false
		}).sort({'lastUpdated': -1}).skip(skip).limit(size)

		try {
			const total = await this.mongo.db.collection<Film>('films').countDocuments({
				editVerified: true,
				isHidden: false
			})
			const totalPages = Math.ceil(total/size)
			const films = await query.toArray()
			// Loop through each film to retrieve its poster
			const results = await Promise.all(films.map(async (film) => {

				try {
					if(!film.hasPoster){
						return film
					} else {
						const poster = await this.mongo.db.collection<Photo>('photos').findOne({
							parentCollection: 'films', 
							parentId: film.id, 
							type: 'poster', 
							photoIndex: 0
						})
						return {
							posterUrl: poster.downsizedUrl,
							...film
						}
					}
				} catch {
					throw new BadRequestException()
				}
			}))
			return {
				data: results,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1 
			}
		} catch (err: any) {
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findAllUnverified() {
		try {
			let films = await this.mongo.db.collection<Film>('films').find({editVerified: false}).sort({lastUpdated: 1}).limit(50).toArray()
			
			return films
		} catch (err: any) {
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findAllHidden() {
		try {
			let films = await this.mongo.db.collection<Film>('films').find({isHidden: true}).sort({lastUpdated: 1}).toArray()			
			return films
		} catch (err: any) {
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findOne(id: string, userId?: string) {
		try {
			// Run queries
			const film = await this.mongo.db.collection<Film>('films').findOne({id: id});

			// Never permit the less privileged access hidden films
			if(film.isHidden && userId){
				const userExt = await this.mongo.db.collection<UserExt>('users').findOne({id: userId})
				if(userExt.role === 'member' || userExt.role === 'journalist'){ throw new ForbiddenException('This resource is strictly restricted') }
			} else if(film.isHidden && !userId){ throw new ForbiddenException('This resource is strictly restricted') }

			const poster = await this.mongo.db.collection<Photo>('photos').findOne({parentCollection: 'films', parentId: id, type: 'poster', photoIndex: 0})
			// Check whether the film is public or deleted before continuing
			if(!film){ throw new NotFoundException() }

			const stillsResults = await this.mongo.db.collection<Photo>('photos').find({
				parentCollection: 'films',
				parentId: id,
				type: 'still'
			}).sort({photoIndex: 1}).limit(3).toArray();

			const companiesResults = await this.mongo.db.collection<Role>('roles').find({parentCollection: 'companies', ownerCollection: 'films', ownerId: id}).toArray()
			const peopleResults = await this.mongo.db.collection<Role>('roles').find({parentCollection: 'people', ownerCollection: 'films', ownerId: id}).toArray()
			const reviews = await this.findRatings(id);

			const stills = stillsResults.map((item) => {
				return {
					index: item.photoIndex,
					url: item.optimisedUrl,
					credit: item.attribution,
					altText: item.description
				}
			})

			const people = await Promise.all(
				peopleResults.map(async (item) => {
					const personPhoto = await this.mongo.db.collection<Photo>('photos').findOne({
						parentCollection: 'people',
						parentId: item.parentId,
						photoIndex: 0,
						type: 'image'
					})
					const path = `/films/${item.ownerId}/people/${item.parentId}/roles/${item.id}`;

					return {
						...item,
						photoUrl: personPhoto?.downsizedUrl,
						urlPath: path
					}
				})
			)
			
			const companies = await Promise.all(
				companiesResults.map(async (item) => {
					const companyPhoto = await this.mongo.db.collection<Photo>('photos').findOne({
						parentCollection: 'companies',
						parentId: item.parentId,
						photoIndex: 0,
						type: 'image'
					})
					const path = `/films/${item.ownerId}/companies/${item.parentId}/roles/${item.id}`;
					return {
						...item,
						photoUrl: companyPhoto?.downsizedUrl,
						urlPath: path
					}
				})
			)

			// Filter people into designated categories
			const mainCast = people.filter((value) => value.department == 'Leading Cast');
			const additionalCast = people.filter((value) => value.department == 'Supporting Cast');
			const mainCrew = people.filter((value) => value.department == 'Above Line');
			const productionCrew = people.filter((value) => value.department == 'Production');
			const everyoneElse = people.filter((value) => {
				const aboveElse = value.department === 'Leading Cast' || value.department === 'Supporting Cast' || value.department === 'Above Line' || value.department === 'Production';
				return !aboveElse;
			})

			const details = {
				...film,
				poster: poster ? {
					url: poster.optimisedUrl,
					index: poster.photoIndex,
					credit: poster.attribution,
					altText: poster.description
				} : null,
				keyRoles: {
					writer: people.filter((value) => value.role === 'Writer'),
					director: people.filter((value) => value.role === 'Director'),
					producer: people.filter((value) => value.role === 'Producer'),
					cast: people.filter((value) => value.department === 'Leading Cast')
				}
			}

			// console.log(details)
			return {
				details: details,
				stills: stills,
				companies: companies,
				cast: [...mainCast, ...additionalCast],
				crew: [...mainCrew, ...productionCrew, ...everyoneElse],
				reviews: reviews
			}
		} catch(err: any){
			// console.log(err)
			throw new NotFoundException("Could not retrieve film");
		}
	}

	async findOneDetailsOnly(id: string){
		try {
			return this.mongo.db.collection<Film>('films').findOne({id: id})
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createOne(film: CreateFilmDto, user: string){
		// Don't allow films of non South African origin
		if(film.countries.indexOf('South Africa') < 0){ throw new BadRequestException('All films must be of South African origin') }
		const time = new Date();
		if(film.releaseDate){
			film.releaseDate = new Date(film.releaseDate);
		}
		
		try {
			const entity: Film = {
				id: await this.mongo.generateUniqueId('films', 12),
				...film,
				hasPoster: false,
				listRatings: 0,
				listScore: 0,
				lastUpdated: time,
				created: time,
				editLocked: false,
				isHidden: false,
				editVerified: false,
				lastVerified: time
			}
			await this.mongo.insertOne(entity, 'films');

			// Write film action into history
			const historyObj: HistoryOpt = {
				dataObject: film,
				user: user,
				time: time,
				action: 'create',
				kind: 'films',
				id: entity.id
			}
			await this.mongo.createHistory(historyObj);

			const searchRecord: FilmSchema = {
				id: entity.id,
				name: entity.name,
				year: entity.year,
				genres: entity.genres,
				type: entity.type,
				format: entity.format,
				productionStage: entity.productionStage,
				releaseDate: this.mongo.dateToBigInt(entity.releaseDate),
				initialPlatform: entity.initialPlatform,
				created: this.mongo.dateToBigInt(entity.created),
				lastUpdated: this.mongo.dateToBigInt(entity.lastUpdated),
				logline: entity.logline,
				listRatings: entity.listRatings,
				listScore: entity.listScore
			}
			await this.search.client.collections('films').documents().create(searchRecord);

			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])

			return entity
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(film: UpdateFilmDto, user: string, id: string, remove?: CollectionFields<Film>){
		const time = new Date()
		if(film.releaseDate){
			film.releaseDate = new Date(film.releaseDate);
		}

		if(!Array.isArray(remove)){ throw new BadRequestException('Provide an array for properties to remove') }
		
		try{
			const entity = await this.mongo.db.collection<Film>('films').findOne({id: id})
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			if(entity.editLocked === true){ throw new BadRequestException("Edit locked") }

			for (const key in film) {
				entity[key] = film[key]
			}

    	entity.lastUpdated = time
			entity.editVerified = false

			const updated = await this.mongo.updateOne<Film>(entity, 'films', remove)		
			const  dataAfter = {...updated}			

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: user,
				time: time,
				action: 'update',
				kind: 'films',
				id: id
			}
			await this.mongo.createHistory(historyObj);

			// If the name has been updated, update all its roles
			if(film.hasOwnProperty('name')){
				await this.mongo.db.collection<Role>('roles').updateMany({ownerName: dataBefore.name, ownerCollection: 'films', ownerId: updated.id}, {
					$set: { ownerName: updated.name }
				})
			}

			const searchRecord: Partial<FilmSchema> = {
				name: updated.name,
				year: updated.year,
				genres: updated.genres,
				type: updated.type,
				format: updated.format,
				listRatings: updated.listRatings,
				listScore: updated.listScore,
				productionStage: updated.productionStage,
				releaseDate: this.mongo.dateToBigInt(updated.releaseDate),
				initialPlatform: updated.initialPlatform,
				lastUpdated: this.mongo.dateToBigInt(updated.lastUpdated),
				logline: updated.logline,
			}
			await this.search.client.collections('films').documents(entity.id).update(searchRecord);

			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])

			if(entity.name !== updated.name){
				await this.mongo.db.collection<Role>('roles').updateMany({
					ownerCollection: 'films',
					ownerId: updated.id
				}, { $set: { ownerName: updated.name } })
			}
			
			return updated;
		} catch(err: any){
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(id: string, user: string){
		const time = new Date();
		try {
			const film = await this.mongo.db.collection<Film>('films').findOne({id: id})

			if(film.editLocked === true){ throw new BadRequestException('Edit locked') };

			const posters = await this.mongo.db.collection<Photo>('photos').find({
				parentCollection: 'films',
				parentId: id,
				type: 'poster'
			}).toArray()

			const stills = await this.mongo.db.collection<Photo>('photos').find({
				parentCollection: 'films',
				parentId: id,
				type: 'still'
			}).toArray()

			// Writes their histories before deletetion and deletes the photo objects
			await Promise.all(
				posters.map(async (poster) => {
					await this.storage.deletePhoto(poster.originalName);
					await this.storage.deletePhoto(poster.optimisedName);
					
					const historyObj: HistoryOpt = {
						dataObject: poster,
						user: user,
						kind: 'photos',
						id: poster.id,
						action: 'delete',
						time: time,
						pId: id,
						pKind: 'films'
					}
					await this.mongo.createHistory(historyObj);
				})
			)

			await Promise.all(
				stills.map(async (still) => {
					await this.storage.deletePhoto(still.originalName);
					await this.storage.deletePhoto(still.optimisedName);
					
					const historyObj: HistoryOpt = {
						dataObject: still,
						user: user,
						kind: 'photos',
						id: still.id,
						action: 'delete',
						time: time,
						pId: id,
						pKind: 'films'
					}
					await this.mongo.createHistory(historyObj);
				})
			)

			const roles = await this.mongo.db.collection<Role>('roles').find({
				ownerCollection: 'films',
				ownerId: id
			}).toArray()

			await Promise.all(
				roles.map(async (role) => {
					const historyObj: HistoryOpt = {
						dataObject: role,
						user: user,
						kind: 'roles',
						id: role.id,
						action: 'delete',
						time: time,
						pId: role.parentId,
						pKind: role.parentCollection
					}
					await this.mongo.createHistory(historyObj);
				})
			)
			
			// Write action into history
			const historyObj: HistoryOpt = {
				dataObject: film,
				user: user,
				kind: 'films',
				id: film.id,
				action: 'delete',
				time: time,
			}
			await this.mongo.createHistory(historyObj);

			await this.search.client.collections('films').documents(film.id).delete();

			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])
			
			await this.mongo.db.collection<Photo>('photos').deleteMany({
				parentCollection: 'films',
				parentId: id
			})
			await this.mongo.db.collection<Role>('roles').deleteMany({
				ownerCollection: 'films',
				ownerId: id
			})
			await this.mongo.db.collection<Film>('films').deleteOne({id: id})
			return {'status': 'deleted'}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async findRatings(filmId: string){
		try {
			const results = await this.mongo.db.collection<Rating>('ratings').find({
				parentKind: 'films',
				parentId: filmId
			}).toArray()

			const ratings = await Promise.all(
				results.map(async (item) => {
					try {
						const user = await this.mongo.db.collection<UserExt>('users').findOne({id: item.authorUid})
						const forUserPhoto = await this.authService.client.users.getUser(item.authorUid)
						return {
							...item,
							publication: user.publication,
							authorDisplayName: user.fullName,
							photoUrl: forUserPhoto.imageUrl,
							authorUsername: user.username
						}
					} catch (err : any){
						throw new NotFoundException(err.message)
					}
				})
			)
		
			return ratings
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async findUnverifiedRatings(){
		try {
			const ratings = await this.mongo.db.collection<Rating>('ratings').find({editVerified: false}).sort({lastUpdated: 1}).limit(50).toArray()

			const results = await Promise.all(
				ratings.map(async (item) => {
					try{
						const parent = await this.mongo.db.collection<Film>('films').findOne({id: item.parentId})
						return { 
							parentName: parent.name,
							...item
						}
					} catch(err: any) {
						throw new NotFoundException()
					}
				})
			)
		
			return results
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createOneRating(data: CreateListRatingDto, opt: RatingOpt){
		if(data.reviewLink.slice(0,8) !== 'https://'){throw new BadRequestException(`The review link must begin with the secure protocol, "https://"`)}

		try {
			const existingReviews = await this.mongo.db.collection<Rating>('ratings').countDocuments({authorUid: opt.user});
			if(existingReviews > 0) {throw new BadRequestException("You can only review once")};

			const user = await this.mongo.db.collection<UserExt>('users').findOne({id: opt.user})

			const review: Rating = {
				id: await this.mongo.generateUniqueId('ratings', 12),
				authorUid: user.id,
				editVerified: false,
				lastUpdated: opt.time,
				created: opt.time,
				parentId: opt.parentId,
				parentKind: 'films',
				listRating: data.listRating as Rating['listRating'],
				reviewLink: data.reviewLink,
				verdict: data.verdict
			}

			await this.mongo.insertOne(review, 'ratings');

			// Calculate the rating score
			const results = await this.mongo.db.collection<Rating>('ratings').find({
				parentId: opt.parentId,
				parentKind: 'films'
			}).toArray()

			const info = await this.mongo.calculateRatingScore(results);

			await this.mongo.updateOne({
				id: opt.parentId,
				listScore: info.listScore,
				listRating: info.totalRatings
			}, 'films')

			const historyObj: HistoryOpt = {
				dataObject: review,
				user: opt.user,
				kind: 'ratings',
				id: review.id,
				action: 'create',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			const searchRecord: Partial<FilmSchema> = {
				listRatings: info.totalRatings,
				listScore: info.listScore
			}
			await this.search.client.collections('films').documents(opt.parentId).update(searchRecord)

			return review
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRating(data: UpdateListRatingDto, opt: RatingOpt){

		if(data.reviewLink && data.reviewLink?.slice(0,8) !== 'https://'){
			throw new BadRequestException(`The review link must begin with the secure protocol, "https://"`)
		}

		try {
			const entity = await this.mongo.db.collection<Rating>('ratings').findOne({id: opt.ratingId})
			const dataBefore = {...entity};

			if(entity.authorUid !== opt.user){ throw new BadRequestException('Action not allowed') }
			entity.editVerified = false
			entity.lastUpdated = opt.time
			for (const key in data) {
				entity[key] = data[key]
			}

			const dataAfter = {...entity};
			await this.mongo.updateOne(entity, 'ratings');

			// Calculate the rating score
			const results = await this.mongo.db.collection<Rating>('ratings').find({parentId: opt.parentId, parentKind: 'films'}).toArray();
			const info = await this.mongo.calculateRatingScore(results);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'ratings',
				id: entity.id,
				action: 'update',
				time: opt.time,
			}

			await this.mongo.createHistory(historyObj);
			
			await this.mongo.updateOne({
				id: opt.parentId,
				listScore: info.listScore,
				listRatings: info.totalRatings
			}, 'films')

			const searchRecord: Partial<FilmSchema> = {
				listRatings: info.totalRatings,
				listScore: info.listScore
			}
			await this.search.client.collections('films').documents(opt.parentId).update(searchRecord)

			return entity
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	async deleteOneRating(opt: RatingOpt){
		try {
			const user = await this.mongo.db.collection<UserExt>('users').findOne({id: opt.user})
			const rating = await this.mongo.db.collection<Rating>('ratings').findOne({id: opt.ratingId})

			if(rating.authorUid !== opt.user && user.role !== 'admin') {
				throw new BadRequestException('Action not allowed')
			}

			const historyObj: HistoryOpt = {
				dataObject: rating,
				user: opt.user,
				kind: 'ratings',
				id: rating.id,
				action: 'delete',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			await this.mongo.db.collection<Rating>('ratings').deleteOne({id: opt.ratingId})

			const results = await this.mongo.db.collection<Rating>('ratings').find({parentId: opt.parentId, parentKind: 'films'}).toArray();
			const info = await this.mongo.calculateRatingScore(results);

			await this.mongo.updateOne({
				id: opt.parentId,
				listScore: info.listScore,
				listRatings: info.totalRatings
			}, 'films')

			const searchRecord: Partial<FilmSchema> = {
				listRatings: info.totalRatings,
				listScore: info.listScore
			}
			await this.search.client.collections('films').documents(opt.parentId).update(searchRecord)

			return {'status': 'deleted'}
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	async verifyRating(opt: RatingOpt){
		try {
			const review = await this.mongo.db.collection<Rating>('ratings').findOne({id: opt.ratingId})
			review.editVerified = true
			await this.mongo.updateOne<Rating>(review, 'ratings')

			// Update critic score
			const user = await this.mongo.db.collection<UserExt>('users').findOne({id: review.authorUid})
			const recentReviews = await this.mongo.db.collection<Rating>('ratings').countDocuments({ authorUid: user.id })
			const score = ( (recentReviews <= 48 ? recentReviews : 48 ) / 48 ) * 100
			user.criticScore = score
			await this.mongo.updateOne(user, 'users')

			return {status: 'success'}
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async uploadPoster(opt: ImageOpt, image: Express.Multer.File){
		if(opt.index !== 0){ throw new BadRequestException('Unknown index') }
		try {
			const existing = await this.mongo.db.collection<Photo>('photos').countDocuments({
				parentCollection: 'films',
				parentId: opt.parentId,
				type: 'poster',
				photoIndex: 0
			})

			if(existing >= 1) {
				throw new BadRequestException("Too many posters for a single resource");
			}

			const data = await this.storage.uploadPoster(image);

			const entity: Photo = {
				...data,
				photoIndex: 0,
				parentCollection: 'films',
				type: 'poster',
				parentId: opt.parentId,
				uploadedByUser: opt.user,
				lastUpdated: opt.time,
				created: opt.time,
				id: await this.mongo.generateUniqueId('photos', 12)
			}

			await this.mongo.insertOne(entity, 'photos');

			// Alert data change to the parent entity
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time,
				hasPoster: true
			}, 'films')

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'photos',
				id: entity.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);

			const searchRecord: Partial<FilmSchema> = {
				posterUrl: data.downsizedUrl
			}
			await this.search.client.collections('films').documents(opt.parentId).update(searchRecord);

			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])

			return entity
		} catch (err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updatePoster(data: PhotoDto, opt: ImageOpt){
		try {
			const entity = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'films',
				parentId: opt.parentId,
				photoIndex: 0,
				type: 'poster'
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
			}, 'films')

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

			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])

			return entity
		} catch (err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deletePoster(opt: ImageOpt){
		try{
			const poster = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'films',
				parentId: opt.parentId,
				type: 'poster',
				photoIndex: 0
			})
			const historyObj: HistoryOpt = {
				dataObject: poster,
				user: opt.user,
				kind: 'photos',
				id: poster.id,
				action: 'delete',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}

			console.log(poster.originalUrl)
			await this.storage.deletePhoto(poster.originalName);
			await this.storage.deletePhoto(poster.optimisedName);
			await this.storage.deletePhoto(poster.downsizedName);
			await this.mongo.createHistory(historyObj);
			await this.mongo.db.collection<Photo>('photos').deleteOne({
				parentCollection: 'films',
				parentId: opt.parentId,
				type: 'poster',
				photoIndex: 0
			})

			await this.mongo.updateOne({
				id: opt.parentId,
				hasPoster: false,
				editVerified: false,
				lastUpdated: opt.time
			}, 'films')

			const searchRecord: Partial<FilmSchema> = {
				posterUrl: null
			}
			await this.search.client.collections('films').documents(opt.parentId).update(searchRecord);

			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])

			return {'status': 'deleted'}
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException()
		}
	}

	async uploadStill(opt: ImageOpt, image: Express.Multer.File){
		try {
			if(opt.index - 2 > 0){ throw new BadRequestException('Unknown index') }

			const existing = await this.mongo.db.collection<Photo>('photos').countDocuments({
				parentCollection: 'films',
				parentId: opt.parentId,
				type: 'still'
			})

			if(existing >= 3) {
				throw new BadRequestException("Too many stills for a single resource");
			}

			const file = await this.storage.uploadStill(image);

			const entity: Photo = {
				id: await this.mongo.generateUniqueId('photos', 12),
				...file,
				photoIndex: opt.index,
				parentCollection: 'films',
				parentId: opt.parentId,
				created: opt.time,
				lastUpdated: opt.time,
				uploadedByUser: opt.user,
				type: 'still'
			}
			
			await this.mongo.insertOne(entity, 'photos');

			// Alert data change to the parent entity
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'films')

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'photos',
				id: entity.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);

			return entity
		} catch (err: any ) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updateStill(data: PhotoDto, opt: ImageOpt){
		try {
			const entity = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'films',
				parentId: opt.parentId,
				type: 'still',
				photoIndex: opt.index
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
			}, 'films')

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

			return entity;
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteStill(opt: ImageOpt){
		try{
			const still = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'films',
				parentId: opt.parentId,
				type: 'still',
				photoIndex: opt.index
			})

			const historyObj: HistoryOpt = {
				dataObject: still,
				user: opt.user,
				kind: 'photos',
				id: still.id,
				action: 'delete',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
	
			await this.storage.deletePhoto(still.originalName);
			await this.storage.deletePhoto(still.optimisedName);
			await this.storage.deletePhoto(still.downsizedName);
			await this.mongo.createHistory(historyObj);
			await this.mongo.db.collection<Photo>('photos').deleteOne({
				parentCollection: 'films',
				parentId: opt.parentId,
				type: 'still',
				photoIndex: opt.index
			})

			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false
			}, 'films')

			return {'status': 'deleted'}
		} catch(err: any) {
			throw new BadRequestException()
		}
	}

	// Company Roles methods
	async createCompanyRole(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		try {
			const serve = await this.companiesService.createOneRole(data, opt);

			return serve;
		} catch(err: any){
			throw new BadRequestException();
		}
	}

	async updateCompanyRole(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		try {
			const serve = await this.companiesService.updateOneRole(data, opt);

			return serve;
		} catch(err: any){
			throw new BadRequestException();
		}
	}

	async deleteCompanyRole(opt: CompanyRoleOpt){
		try {
			const serve = await this.companiesService.deleteOneRole(opt);

			return serve;
		} catch(err: any){
			throw new BadRequestException();
		}
	}


	// Person Role methods
	async createPersonRole(data: CreatePersonRoleDto, opt: PersonRoleOpt){
		try {
			const serve = await this.peopleService.createOneRole(data, opt);

			return serve;
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	async updatePersonRole(data: UpdatePersonRoleDto, opt: PersonRoleOpt){
		try {
			const serve = await this.peopleService.updateOneRole(data, opt);

			return serve;
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	async deletePersonRole(opt: PersonRoleOpt){
		try {
			const serve = await this.peopleService.deleteOneRole(opt);

			return serve;
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	// Advanced methods
	async selectFilmOfTheDay(){
		const time = new Date();
		const twelveMonthsAgo = new Date(Number(time)-(1000*60*60*24*365));
		const seventyTwoMonthsAgo = new Date(Number(time)-(1000*60*60*24*1825));
		try {
			const films = await this.mongo.db.collection<Film>('films').find({
				productionStage: 'finished',
				hasPoster: true,
				editLocked: true,
				editVerified: true,
				releaseDate: {$lte: twelveMonthsAgo}
			}).limit(500).toArray();

			if(films.length > 0){ 

				const selected = await this.mongo.db.collection<Today>('today').find({created: {$lte: seventyTwoMonthsAgo}, collection: 'films'}).toArray();
				const eligible = films.filter(item => {
					return selected.filter(val => val.identifier === item.id).length > 0 ? false : true;
				})
				const selection = eligible[Math.floor(Math.random()*eligible.length)];
				const today: Today = {
					id: await this.mongo.generateUniqueId('today', 12),
					collection: 'films',
					identifier: selection.id,
					day: time.getDate(),
					month: time.getMonth(),
					year: time.getFullYear(),
					created: time
				}
				await this.mongo.insertOne(today, 'today')

			}
		} catch(err) {
			// throw new BadRequestException()
		}
	}

	async getFilmOfTheDay(){
		const time = new Date();
		try {
			const today = await this.mongo.db.collection<Today>('today').findOne({
				day: time.getDate(),
				month: time.getMonth(),
				year: time.getFullYear(),
				collection: 'films'
			})

			const film = await this.mongo.db.collection<Film>('films').findOne({id: today.identifier})
			const poster = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'films',
				parentId: today.identifier,
				type: 'poster',
				photoIndex: 0
			})
			const stills = await this.mongo.db.collection<Photo>('photos').find({
				parentCollection: 'films',
				parentId: today.identifier,
				type: 'still'
			}).toArray();
			const talent = await this.mongo.db.collection<Role>('roles').find({
				ownerCollection: 'films',
				ownerId: today.id,
				role: {$in: ['Director', 'Writer', 'Producer']}
			})
			return { film, poster, stills, talent }
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async getRecentlyAdded(limit?: number){
		try {
			const cache = await this.mongo.db.collection<Freeze>('freeze').findOne({id: 'films-data-recent', expiry: {$gt: new Date}})

			if(cache){

				return JSON.parse(cache.body)

			} else {

				const films = await this.mongo.db.collection<Film>('films').find({
					hasPoster: true,
					isHidden: false,
					editVerified: true
				}).sort({created: -1}).limit(limit ? limit : 10).toArray();

				const results = await Promise.all(films.map(async (film) => {
					try {
						const poster = await this.mongo.db.collection<Photo>('photos').findOne({
							parentCollection: 'films',
							parentId: film.id,
							photoIndex: 0,
							type: 'poster'
						})

						return {
							...film,
							posterUrl: poster.downsizedUrl
						}
					} catch {
						throw new BadRequestException()
					}
				}))
			
				const newCache: Freeze = {
					id: 'films-data-recent',
					body: JSON.stringify(results),
					expiry: new Date( Date.now() + (1000*60*60) )
				}
				await this.mongo.db.collection<Freeze>('freeze').updateOne(
					{id: newCache.id},
					{ $set: newCache },
					{upsert: true}
				)

				return results

			}

		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async getLatestReleases(limit?: number){
		const now = new Date()
		try {
			const cache = await this.mongo.db.collection<Freeze>('freeze').findOne({id: 'films-data-latest', expiry: {$gt: new Date}})

			if(cache){

				return JSON.parse(cache.body)

			} else {

				const films = await this.mongo.db.collection<Film>('films').find({
					hasPoster: true,
					isHidden: false,
					productionStage: 'finished',
					releaseDate: {$lte: now},
					editVerified: true
				}).sort({releaseDate: -1}).limit(limit ? limit : 10).toArray()

				const results = await Promise.all(films.map(async (film) => {
					try {
						const poster = await this.mongo.db.collection<Photo>('photos').findOne({
							parentCollection: 'films',
							parentId: film.id,
							photoIndex: 0,
							type: 'poster'
						})

						return {
							...film,
							posterUrl: poster.downsizedUrl
						}
					} catch {
						throw new BadRequestException()
					}
				}))

				const newCache: Freeze = {
					id: 'films-data-latest',
					body: JSON.stringify(results),
					expiry: new Date( Date.now() + (1000*60*60) )
				}
				await this.mongo.db.collection<Freeze>('freeze').updateOne(
					{id: newCache.id},
					{ $set: newCache },
					{upsert: true}
				)

				return results

			}
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async getUpcoming(limit?: number){
		const now = new Date();
		const thisYear = now.getFullYear();

		try {
			const cache = await this.mongo.db.collection<Freeze>('freeze').findOne({id: 'films-data-upcoming', expiry: {$gt: new Date}})

			if(cache){
			  console.log('Cached')
				return JSON.parse(cache.body)

			} else {

				const films = await this.mongo.db.collection<Film>('films').find({
					$and: [
						{ hasPoster: true, isHidden: false, editVerified: true },
						{
							$or: [
								{ releaseDate: {$gt: now} },
								{ releaseDate: {$exists: false}, year: {$gte: thisYear}, productionStage: {$ne: 'finished'} }
							]
						}
					]
				}).sort({year: 1}).sort({releaseDate: 1}).limit(limit ? limit : 10).toArray()

				const results = await Promise.all(films.map(async (film) => {
					try {
						const poster = await this.mongo.db.collection<Photo>('photos').findOne({
							parentCollection: 'films',
							parentId: film.id,
							photoIndex: 0,
							type: 'poster'
						})

						return {
							...film,
							posterUrl: poster.downsizedUrl
						}
					} catch (err: any) {
						throw new BadRequestException()
					}
				}))

				const newCache: Freeze = {
					id: 'films-data-upcoming',
					body: JSON.stringify(results),
					expiry: new Date( Date.now() + (1000*60*60) )
				}
				await this.mongo.db.collection<Freeze>('freeze').updateOne(
					{id: newCache.id},
					{ $set: newCache },
					{upsert: true}
				)
				console.log('Request')
				return results;

			}
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async getTrendingFilms(limit?: number){
		const sevenDaysAgo = new Date(Number(new Date)-(1000*60*60*24*7));
		try{

			const cache = await this.mongo.db.collection<Freeze>('freeze').findOne({id: 'films-data-trending', expiry: {$gt: new Date}})

			if(cache){

				return JSON.parse(cache.body)

			} else {

				const films = await this.mongo.db.collection<Hit>('hits').aggregate<Film>([
					{ $match: { time: { $gt: sevenDaysAgo }, collection: 'films' } },
					{ $group: { _id: "$identifier", count: { $sum: 1 } } },
					{ $sort: { count: -1 } },
					{ $limit: 100 },
					{ $lookup: { from: 'films', localField: '_id', foreignField: 'id', as: 'details' } },
					{ $match: { 'details': { $ne: [] } } },
					{ $limit: limit ? limit : 10 },
					{ $unwind: '$details' },
					{ $replaceRoot: { newRoot: '$details' } }
				]).toArray();
		
				const results = await Promise.all(films.map(async (film) => {
					try {
						if(film.hasPoster === true){
							const poster = await this.mongo.db.collection<Photo>('photos').findOne({
								parentCollection: 'films',
								parentId: film.id,
								type: 'poster',
								photoIndex: 0
							})
							
							return {
								...film,
								posterUrl: poster.downsizedUrl
							}
						} else {				
							return film
						}
					} catch(err) {
						throw new BadRequestException(err.message)
					}
				}))

				const newCache: Freeze = {
					id: 'films-data-trending',
					body: JSON.stringify(results),
					expiry: new Date( Date.now() + (1000*60*60) )
				}
				await this.mongo.db.collection<Freeze>('freeze').updateOne(
					{id: newCache.id},
					{ $set: newCache },
					{upsert: true}
				)
				
				return results.filter((val) => typeof val === 'object').slice(0, limit ? limit+1 : 10);

			}
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	// Settings Methods
	async hideFilm(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				isHidden: true
			}, 'films')
			await this.search.client.collections('films').documents(id).delete()
			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])
			return {status: 'success'};
		} catch(err: any){
			// console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async unhideFilm(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				isHidden: false
			}, 'films')

			const film = await this.mongo.db.collection<Film>('films').findOne({id: id})
			const directors = await this.mongo.db.collection<Role>('roles').find({
				ownerCollection: 'films',
				ownerId: film.id,
				parentCollection: 'people',
				role: 'Director'
			}).toArray()
			const directorNames = directors.map(val => val.parentName);

			const searchRecord: FilmSchema = {
				id: film.id,
				name: film.name,
				year: film.year,
				genres: film.genres,
				type: film.type,
				format: film.format,
				productionStage: film.productionStage,
				releaseDate: this.mongo.dateToBigInt(film.releaseDate),
				initialPlatform: film.initialPlatform,
				created: this.mongo.dateToBigInt(film.created),
				lastUpdated: this.mongo.dateToBigInt(film.lastUpdated),
				logline: film.logline,
				listRatings: film.listRatings,
				listScore: film.listScore,
				directors: directorNames
			}

			const poster = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'films',
				parentId: film.id,
				type: 'poster',
				photoIndex: 0
			})

			if(poster){ searchRecord.posterUrl = poster.downsizedUrl }

			await this.search.client.collections('films').documents().create(searchRecord);
			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])

			return {status: 'success'};
		} catch(err: any){
			// console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async verifyFilmEdit(id: string, user: string){
		try {
			const history = await this.justHistory(id);
			const reputations = this.mongo.determineUserReputation(history);
			const film = await this.mongo.db.collection<Film>('films').findOne({id: id})
			await Promise.all(
				reputations.map(async score => {
					try {
						const user = await this.mongo.db.collection<UserExt>('users').findOne({id: score[0]})
						user.reputation += score[1]
						await this.mongo.updateOne(user, 'users')
					} catch (err: any){}
				})
			)

			const timeNow = new Date()
			const previousVerificationDate = film.lastVerified

			film.editVerified = true
			film.lastVerified = timeNow

			await this.mongo.updateOne(film, 'films')

			const edit: EditsMetadata = {
				id: await this.mongo.generateUniqueId('edits', 16),
				user: user,
				intervalBegins: previousVerificationDate,
				intervalEnds: timeNow,
				pageId: film.id,
				pageType: 'films',
				reputations: reputations
			}

			await this.mongo.insertOne(edit, 'edits')

			await Promise.all([
				this.mongo.deleteFreeze('films-data-latest'),
				this.mongo.deleteFreeze('films-data-recent'),
				this.mongo.deleteFreeze('films-data-trending'),
				this.mongo.deleteFreeze('films-data-upcoming'),
			])

			return {status: 'success'};
		} catch(err: any){
			// console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async lockFilmEdit(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				editLocked: true
			}, 'films')
			return {status: 'success'};
		} catch(err: any){
			// console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async unlockFilmEdit(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				editLocked: false
			}, 'films')
			return {status: 'success'};
		} catch(err: any){
			// console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	// History method
	async justHistory(filmId: string, intervalBegins?: Date, intervalEnds?: Date){
		try {
			const film = await this.mongo.db.collection<Film>('films').findOne({id: filmId})
			const lastestMod = film.hasOwnProperty('lastVerified') ? new Date(film.lastVerified) : new Date(film.created)

			const begins: Date = intervalBegins ? intervalBegins : lastestMod
			const ends: Date = intervalBegins ? intervalEnds : new Date()

			const photosHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xKind: 'photos',
				wKind: 'films',
				wIdentifier: filmId,
				xTimestamp: {$gte: begins, $lte: ends}
			}).sort({xTimestamp: -1}).toArray();

			const rolesHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xKind: 'roles',
				wKind: 'films',
				wIdentifier: filmId,
				xTimestamp: {$gte: begins, $lte: ends}
			}).sort({xTimestamp: -1}).toArray();

			const filmHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xKind: 'films',
				xIdentifier: filmId,
				xTimestamp: {$gte: begins, $lte: ends}
			}).sort({xTimestamp: -1}).toArray();

			const allHistories = [
				...filmHistory, 
				...photosHistory,
				...rolesHistory
			]

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

	async getSnapShots(filmId: string){
		try {
			return await this.mongo.db.collection<EditsMetadata>('edits').find({pageId: filmId, pageType: 'films'}).limit(100).toArray()
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async findHistory(filmId: string){
		try {
			const history = await this.justHistory(filmId);
			const sortedHistory = await this.mongo.decodeHistory(history);
			
			return sortedHistory;
		} catch (err: any) {
			throw new NotFoundException(err.message)
		}
	}
}