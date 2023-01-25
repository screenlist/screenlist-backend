import { Injectable, ParseFileOptions, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { 
	Film, 
	Poster, 
	Still,
	FilmType,
	ImageOpt,
	RatingOpt
} from './films.types';
import {
	CreatePosterDto,
	UpdatePosterDto,
	CreateStillDto,
	UpdateStillDto,
	CreateFilmDto, 
	UpdateFilmDto,
	CreateListRatingDto,
	UpdateListRatingDto
} from './films.dto';
import {
	Company,
	CompanyRole
} from '../companies/companies.types';
import { CompaniesService } from '../companies/companies.service';
import {
	Link,
	Platform,
} from '../platforms/platforms.types';
import { PlatformsService } from '../platforms/platforms.service';
import {
	Person,
	PersonRole,
} from '../people/people.types';
import { StorageService } from '../storage/storage.service';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';



@Injectable()
export class FilmsService {
	constructor(
		private db: DatabaseService,
		private storage: StorageService,
		private authService: AuthService
	){}

	async findAll(cursor?: string) {
		let query = this.db.createQuery('Film').order('lastUpdated', {descending: true}).limit(60)
		
		// This will implement pagination [NOT FINISHED YET]
		if(cursor){
			query = query.start(cursor);
		}

		try {
			const films = await this.db.runQuery(query)
			// Loop through each film to retrieve its poster
			const results = await Promise.all(films[0].map(async (film) => {
				film.id = film[this.db.KEY]['id']
				const posterKey = this.db.key(['Film', +film.id, 'Poster', '0']);

				try {
					const [poster] = await this.db.get(posterKey);
					if(!poster){
						return film
					} else {
						film.posterUrl = poster.lqUrl ? poster.lqUrl : poster.sdUrl;
						return film
					}
				} catch {
					throw new BadRequestException()
				}
			}))
			return results
		} catch (err: any) {
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findOne(id: string) {
		const filmKey = this.db.key(['Film', +id]);
		const posterKey = this.db.key(['Film', +id, 'Poster', '0'])
		// Create queries
		const linksQuery =this.db.createQuery('Link')
			.hasAncestor(filmKey)
			.order('created', {descending: true});
		const stillsQuery = this.db.createQuery('Still')
			.hasAncestor(filmKey)
			.order('stillIndex')
			.limit(3); 
		const distributorsQuery = this.db.createQuery('CompanyRole')
			.filter('ownerId', '=', `${filmKey.id}`)
			.filter('type', '=', 'distribution') 
			.order('companyName');
		const producersQuery = this.db.createQuery('CompanyRole')
			.filter('ownerId', '=', `${filmKey.id}`)
			.filter('type', '=', 'production')
			.order('companyName');
		const castQuery = this.db.createQuery('PersonRole')
			.filter('ownerId', '=', `${filmKey.id}`)
			.filter('category', '=', 'cast')
			.limit(50);
		const crewQuery = this.db.createQuery('PersonRole')
			.filter('ownerId', '=', `${filmKey.id}`)
			.filter('category', '=', 'crew')
			.limit(50);

		try {
			// Run queries
			const [details] = await this.db.get(filmKey);
			const [poster] = await this.db.get(posterKey);
			// Check whether the film is public or deleted before continuing
			const [platformLinks] =  await this.db.runQuery(linksQuery);
			let [stills] = await this.db.runQuery(stillsQuery);
			let [distributors] = await this.db.runQuery(distributorsQuery);
			let [producers] = await this.db.runQuery(producersQuery);
			let [cast] = await this.db.runQuery(castQuery);
			let [crew] = await this.db.runQuery(crewQuery);
			let people = cast.concat(crew);
			const reviews = await this.findRatings(id);

			// Extact the entity id/name from query to expose to the client
			details.id = details[this.db.KEY]["id"]
			details.poster = poster ? {
				url: poster?.sdUrl,
				id: poster[this.db.KEY]['name'],
				credit: poster?.attribution,
				altText: poster?.description
			} : null;

			stills = stills.map((item) => {
				return {
					id: item[this.db.KEY]['name'],
					url: item.hdUrl ? item.hdUrl : item.sdUrl,
					credit: item.attribution,
					altText: item.description
				}
			})

			people = await Promise.all(
				people.map(async (item) => {
					const key = this.db.key(['Person', +item.personId]);
					const [person] = await this.db.get(key);
					const path = `/films/${item.ownerId}/people/${item.personId}/roles/${item[this.db.KEY]['id']}`;

					return {
						...item,
						photoUrl: person.profilePhotoUrl,
						id: item[this.db.KEY]['id'],
						urlPath: path
					}
				})
			)

			distributors = await Promise.all(
				distributors.map(async (item) => {
					const key = this.db.key(['Company', +item.companyId])
					const [company] = await this.db.get(key)
					const path = `/films/${item.ownerId}/companies/${item.companyId}/roles/${item[this.db.KEY]['id']}`;
					return {
						...item,
						id: item[this.db.KEY]['id'],
						photoUrl: company.profilePhotoUrl,
						urlPath: path
					}
				})
			)
			
			producers = await Promise.all(
				producers.map(async (item) => {
					const key = this.db.key(['Company', +item.companyId])
					const [company] = await this.db.get(key)
					const path = `/films/${item.ownerId}/companies/${item.companyId}/roles/${item[this.db.KEY]['id']}`;
					return {
						...item,
						id: item[this.db.KEY]['id'],
						photoUrl: company.profilePhotoUrl,
						urlPath: path
					}
				})
			)

			// Filter people into designated categories
			const mainCast = people.filter((value) => value.department == 'main cast');
			const additionalCast = people.filter((value) => value.department == 'additional cast');
			const mainCrew = people.filter((value) => value.department == 'above line');
			const productionCrew = people.filter((value) => value.department == 'production');
			const everyoneElse = people.filter((value) => {
				const aboveElse = value.department == 'main cast' || value.department == 'additional cast' || value.department == 'above line' || value.department == 'production';
				return !aboveElse;
			})

			const film = {
				details: details,
				stills: stills as Still[],
				producers: producers,
				distributors: distributors,
				cast: [...mainCast, ...additionalCast],
				crew: [...mainCrew, ...productionCrew, ...everyoneElse],
				reviews: reviews
			}

			return film
		} catch(err: any){
			throw new NotFoundException("Could not retrieve film");
		}
	}

	async createOne(film: CreateFilmDto, user: string){
		// A variable to house all entities created
		let entities = [];
		// Creates the film details entity
		const filmKey = this.db.key('Film');
		const time = new Date();
		// film.slug = encodeURIComponent(filmName.toLowerCase().concat("-"+filmKey.id.toString()));
		film.lastUpdated = time;
		film.created = time;
		film.editVerified = false;
		const entity = {
			key: filmKey,
			data: film
		}
		
		try {
			await this.db.insert(entity);

			// Write film action into history
			const historyObj: HistoryOpt = {
				dataObject: film,
				user: user,
				time: time,
				action: 'create',
				kind: 'Film',
				id: filmKey.id
			}
			// save history last to await the entity id
			const history = await this.db.createHistory(historyObj);

			const searchRecord = {
				objectID: entity.key.id,
				name: film.name,
				year: film.year,
				genres: film.genres,
				type: film.type,
				format: film.format,
				productionStage: film.productionStage,
				releaseDate: film.releaseDate,
				initialPlatform: film.initialPlatform,
				created: film.created,
				lastUpdated: film.lastUpdated
			}
			await this.db.algolia.initIndex('films').saveObject(searchRecord).wait();

			return { 'status': 'created', 'film_id': filmKey.id }
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(film: UpdateFilmDto, user: string, id: string){
		const time = new Date()
		const filmKey = this.db.key(['Film', +id]);		
		film.lastUpdated = time;
		film.editVerified = false;
		// Create history
		const historyObj: HistoryOpt = {
			dataObject: film,
			user: user,
			time: time,
			action: 'update',
			kind: 'Film',
			id: filmKey.id
		}
		
		try{
			const [entity] = await this.db.get(filmKey);

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in film) {
				if(entity.hasOwnProperty(key)){
					entity[key] = film[key]
				} else {
					entity[key] = film[key]
				}
			}
			await this.db.update(entity);
			await this.db.createHistory(historyObj);

			const searchRecord = {
				objectID: entity[this.db.KEY]['id'],
				name: film.name,
				year: film.year,
				genres: film.genres,
				type: film.type,
				format: film.format,
				productionStage: film.productionStage,
				releaseDate: film.releaseDate,
				initialPlatform: film.initialPlatform,
				lastUpdated: film.lastUpdated
			}
			await this.db.algolia.initIndex('films').partialUpdateObject(searchRecord, {}).wait();

			return { id: filmKey.id, ...entity };
		} catch(err: any){
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(id: string, user: string){
		const deletion = []
		const time = new Date();
		const filmKey = this.db.key(['Film', +id]);
		const postersQuery = this.db.createQuery('Poster').hasAncestor(filmKey);
		const linksQuery =this.db.createQuery('Link').hasAncestor(filmKey);
		const stillsQuery = this.db.createQuery('Still').hasAncestor(filmKey);
		const companiesRolesQuery = this.db.createQuery('CompanyRole').hasAncestor(filmKey);
		const peopleRolesQuery = this.db.createQuery('PersonRole').hasAncestor(filmKey);
		try {
			const [posters] = await this.db.runQuery(postersQuery);
			const [stills] = await this.db.runQuery(stillsQuery);
			// Deletes the actual files before adding entities
			// to the deletion array
			posters.forEach(async (poster: Poster) => {
				const removal = await this.storage.deletePoster(poster.originalName);
				if(removal){
					deletion.push(poster);
					const historyObj: HistoryOpt = {
						dataObject: poster,
						user: user,
						kind: 'Poster',
						id: poster[this.db.KEY]['id'],
						action: 'delete',
						time: time,
					}
					await this.db.createHistory(historyObj);
				}
			})
			stills.forEach(async (still: Still) => {
				const removal = await this.storage.deletePoster(still.originalName);
				if(removal){
					deletion.push(still);
					const historyObj: HistoryOpt = {
						dataObject: still,
						user: user,
						kind: 'Still',
						id: still[this.db.KEY]['id'],
						action: 'delete',
						time: time,
					}
					await this.db.createHistory(historyObj);
				}
			})

			const [links] = await this.db.runQuery(linksQuery);
			const [companiesRoles] = await this.db.runQuery(companiesRolesQuery);
			const [peopleRoles] = await this.db.runQuery(peopleRolesQuery);

			links.forEach(async (link: Link) => {
				deletion.push(link);
				const historyObj: HistoryOpt = {
					dataObject: link,
					user: user,
					kind: 'Link',
					id: link[this.db.KEY]['id'],
					action: 'delete',
					time: time,
				}
				await this.db.createHistory(historyObj);
			})
			companiesRoles.forEach(async (role: CompanyRole) => {
				deletion.push(role);
				const historyObj: HistoryOpt = {
					dataObject: role,
					user: user,
					kind: 'CompanyRole',
					id: role[this.db.KEY]['id'],
					action: 'delete',
					time: time,
				}
				await this.db.createHistory(historyObj);
			})
			peopleRoles.forEach(async (role: PersonRole) => {
				deletion.push(role);
				const historyObj: HistoryOpt = {
					dataObject: role,
					user: user,
					kind: 'PersonRole',
					id: role[this.db.KEY]['id'],
					action: 'delete',
					time: time
				}
				await this.db.createHistory(historyObj);
			})
			const [film] = await this.db.get(filmKey);
			deletion.push(film);
			// Write action into history
			const historyObj: HistoryOpt = {
				dataObject: film,
				user: user,
				kind: 'Film',
				id: filmKey.id,
				action: 'delete',
				time: time,
			}
			await this.db.algolia.initIndex('films').deleteObject(filmKey.id)
			await this.db.createHistory(historyObj);
			await this.db.transaction().delete(deletion);
			return {'status': 'deleted'}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async findRatings(filmId){
		const filmKey = this.db.key(['Film', +filmId])
		const query = this.db.createQuery('Rating').hasAncestor(filmKey).order('created');
		try {
			let [results] = await this.db.runQuery(query);

			results = results.map((item) => {return {id: item[this.db.KEY]['id'], ...item}})
		
			return results
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createOneRating(data: CreateListRatingDto, opt: RatingOpt){
		data.editVerified = false;
		try {
			const {entity, info} = await this.db.createListRatingEntity(data, opt);

			const updateRatings: UpdateFilmDto = {
				listScore: info.listScore,
				listRatings: info.totalRatings
			} 
			await this.updateOne(updateRatings, opt.user, opt.parentId);

			return {id: entity.key.id, ...entity.data}
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRating(data: UpdateListRatingDto, opt: RatingOpt){
		data.editVerified = false;
		try {
			const {entity, info} = await this.db.updateListRatingEntity(data, opt);

			const updateRatings: UpdateFilmDto = {
				listScore: info.listScore,
				listRatings: info.totalRatings
			} 
			await this.updateOne(updateRatings, opt.user, opt.parentId);

			return {id: entity[this.db.KEY]['id'], ...entity}
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPoster(opt: ImageOpt, image: Express.Multer.File){
		const results = [];
		try {
			const data = await this.storage.uploadPoster(image);
			const createPoster: CreatePosterDto = {
				...data,
				editVerified: false
			}
			const {entity} = await this.db.createPosterEntity(createPoster, opt);
			return {id: entity.key.name, ...entity.data}
		} catch (err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updatePoster(data: UpdatePosterDto, opt: ImageOpt){
		data.editVerified = false;
		try {
			const {entity, history} = await this.db.updatePosterEntity(data, opt);
			return {id: entity[this.db.KEY]['name'], ...entity}
		} catch {
			throw new BadRequestException();
		}
	}

	async deletePoster(opt: ImageOpt){
		try{
			const posterKey = this.db.key([opt.parentKind, +opt.parentId, 'Poster', opt.imageId]);
			const [poster] = await this.db.get(posterKey);
			const historyObj: HistoryOpt = {
				dataObject: poster,
				user: opt.user,
				kind: 'Poster',
				id: posterKey.id,
				action: 'delete',
				time: opt.time,
			}
			await this.storage.deletePoster(poster.originalName);
			await this.storage.deletePoster(poster.hdName);
			await this.storage.deletePoster(poster.sdName);
			await this.storage.deletePoster(poster.lqName);
			await this.db.createHistory(historyObj);
			await this.db.delete(posterKey)
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async uploadStill(opt: ImageOpt, image: Express.Multer.File){
		try {
			const file = await this.storage.uploadStill(image);
			
			const creation: CreateStillDto = {
				...file,
				editVerified: false
			}

			const {entity, history} = await this.db.createStillEntity(creation, opt);
			return { id: entity.key.name, ...entity.data }
		} catch (err: any ) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updateStill(data: UpdateStillDto, opt: ImageOpt){
		data.editVerified = false;
		try {
			const {entity, history} = await this.db.updateStillEntity(data, opt);
			return { id: entity[this.db.KEY]['name'], ...entity }
		} catch {
			throw new BadRequestException();
		}
	}

	async deleteStill(opt: ImageOpt){
		try{
			const stillKey = this.db.key([opt.parentKind, +opt.parentId, 'Still', opt.imageId]);
			const [still] = await this.db.get(stillKey);
			const historyObj: HistoryOpt = {
				dataObject: still,
				user: opt.user,
				kind: 'Still',
				id:stillKey.id,
				action: 'delete',
				time: opt.time,
			}
	
			await this.storage.deleteStill(still.originalName);
			await this.storage.deleteStill(still.hdName);
			await this.storage.deleteStill(still.sdName);
			await this.storage.deleteStill(still.lqName);
			await this.db.createHistory(historyObj);
			await this.db.delete(stillKey);
			return {'status': 'deleted'}
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException()
		}
	}

	async findHistory(filmId: string, cursor?: string){
		let query = this.db.createQuery('History')
													.filter('entityKind', '=', 'Film')
													.filter('entityIdentifier', '=', +filmId)
													.order('timestamp', {descending: true})
													.limit(15);
		if(cursor){
			query = query.start(cursor);
		}

		try {
			const results = await this.db.runQuery(query);
			const users = {}
			let entities = results[0];
			console.log(entities)
			entities = await Promise.all(
				entities.map(async (item) => {
					if(users[item.triggeredByUser]){
						return {
							...item,
							xUsername: users[item.triggeredByUser],
							id: item[this.db.KEY]['id']
						}
					}
					const userKey = this.db.key(['User', item.triggeredByUser]);
					const [user] = await this.db.get(userKey);
					users[item.triggeredByUser] = user.userName;

					return {
						...item,
						xUsername: user.userName,
						id: item[this.db.KEY]['id']
					}
				})
			)
  		const info = results[1];
  		return {
  			data: entities,
  			moreResults: info.moreResults != this.db.NO_MORE_RESULTS ? info.endCursor : null
  		}
		} catch (err: any) {
			throw new NotFoundException(err.message)
		}
	}
}