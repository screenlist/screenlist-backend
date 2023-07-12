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
	CompanyOpt,
	CompanyRoleOpt,
	CompanyRole,
	Company
} from '../companies/companies.types';
import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto,
	UpdateCompanyDto
} from '../companies/companies.dto';
import { CompaniesService } from '../companies/companies.service';
import {
	Link,
	Platform,
} from '../platforms/platforms.types';
import { PlatformsService } from '../platforms/platforms.service';
import {
	PersonRoleOpt,
	PersonOpt,
	PersonRole,
	Person
} from '../people/people.types';
import { 
	CreatePersonRoleDto,
	UpdatePersonRoleDto,
	UpdatePersonDto
} from '../people/people.dto'
import { PeopleService } from '../people/people.service'
import { StorageService } from '../storage/storage.service';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';



@Injectable()
export class FilmsService {
	constructor(
		private db: DatabaseService,
		private storage: StorageService,
		private authService: AuthService,
		private peopleService: PeopleService,
		private companiesService: CompaniesService
	){}

	async findAll(cursor?: string) {
		let query = this.db.createQuery('Film').filter('editVerified', '=', true).order('lastUpdated', {descending: true}).limit(100);
		
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
						film.posterUrl = poster.sdUrl ? poster.sdUrl : poster.lqUrl;
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

	async findAllUnverified() {
		const query = this.db.createQuery('Film').filter('editVerified', '=', false).limit(50);
		try {
			let [films] = await this.db.runQuery(query);
			
			films = await Promise.all(
				films.map(async (film) => {
					const filmId  = film[this.db.KEY]['id'];

					try{
						return {
							id: filmId,
							...film
						}
					} catch(err: any) {}
				})
			)
			// films = films.map((film) => ({id: film[this.db.KEY]['id'], ...film}));

			return films
		} catch (err: any) {
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findOne(id: string) {
		const filmKey = this.db.key(['Film', +id]);
		const posterKey = this.db.key(['Film', +id, 'Poster', '0'])
		// Create queries
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
		const peopleQuery = this.db.createQuery('PersonRole')
			.filter('ownerId', '=', `${filmKey.id}`)

		try {
			// Run queries
			const [details] = await this.db.get(filmKey);
			const [poster] = await this.db.get(posterKey);
			// Check whether the film is public or deleted before continuing
			if(!details){ throw new NotFoundException() }

			let [stills] = await this.db.runQuery(stillsQuery);
			let [distributors] = await this.db.runQuery(distributorsQuery);
			let [producers] = await this.db.runQuery(producersQuery);
			let [people] = await this.db.runQuery(peopleQuery);
			const reviews = await this.findRatings(id);

			// Extact the entity id/name from query to expose to the client
			details.id = details[this.db.KEY]["id"]
			details.poster = poster ? {
				url: poster?.hdUrl,
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
					const photoKey = this.db.key(['Person', +item.personId, 'PersonPhoto', '0']);
					const [person] = await this.db.get(key);
					const [personPhoto] = await this.db.get(photoKey);
					const path = `/films/${item.ownerId}/people/${item.personId}/roles/${item[this.db.KEY]['id']}`;

					return {
						...item,
						photoUrl: personPhoto?.sdUrl,
						id: item[this.db.KEY]['id'],
						urlPath: path
					}
				})
			)

			distributors = await Promise.all(
				distributors.map(async (item) => {
					const key = this.db.key(['Company', +item.companyId]);
					const photoKey = this.db.key(['Company', +item.companyId, 'CompanyPhoto', '0']);
					const [company] = await this.db.get(key);
					const [companyPhoto] = await this.db.get(photoKey);
					const path = `/films/${item.ownerId}/companies/${item.companyId}/roles/${item[this.db.KEY]['id']}`;
					return {
						...item,
						id: item[this.db.KEY]['id'],
						photoUrl: companyPhoto?.sdUrl,
						urlPath: path
					}
				})
			)
			
			producers = await Promise.all(
				producers.map(async (item) => {
					const key = this.db.key(['Company', +item.companyId]);
					const photoKey = this.db.key(['Company', +item.companyId, 'CompanyPhoto', '0']);
					const [company] = await this.db.get(key);
					const [companyPhoto] = await this.db.get(photoKey);
					const path = `/films/${item.ownerId}/companies/${item.companyId}/roles/${item[this.db.KEY]['id']}`;
					return {
						...item,
						id: item[this.db.KEY]['id'],
						photoUrl: companyPhoto?.sdUrl,
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
			
			details.keyRoles = {
				writer: people.filter((value) => value.title === 'writer'),
				director: people.filter((value) => value.title === 'director'),
				producer: people.filter((value) => value.title === 'producer'),
				cast: people.filter((value) => value.department === 'main cast')
			}

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
			// console.log(err)
			throw new NotFoundException("Could not retrieve film");
		}
	}

	async findOneDetailsOnly(id: string){
		const filmKey = this.db.key(['Film', +id]);
		try {
			const [film] = await this.db.get(filmKey);
			return {
				id: film[this.db.KEY]['id'],
				...film
			}
		} catch (err: any) {
			throw new NotFoundException()
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
		film.editLocked = false;
		film.isHidden = false;
		film.hasPoster = false;
		if(film.releaseDate){
			film.releaseDate = new Date(film.releaseDate);
		}

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
		if(film.releaseDate){
			film.releaseDate = new Date(film.releaseDate);
		}
		
		try{
			const [entity] = await this.db.get(filmKey);
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			if(entity.editLocked === true && 
				!film.hasOwnProperty('editLocked') &&
				!film.hasOwnProperty('isHidden') &&
				!film.hasOwnProperty('editVerified') &&
				!film.hasOwnProperty('listScore') &&
				!film.hasOwnProperty('listRatings')
			){ throw new BadRequestException("Edit locked") }

			if( 
				!film.hasOwnProperty('isHidden') && 
				!film.hasOwnProperty('editLocked') &&
				!film.hasOwnProperty('editVerified') &&
				!film.hasOwnProperty('listScore') &&
				!film.hasOwnProperty('listRatings')
			) {	film.editVerified = false; }

			if(film.editVerified === true){
				film.lastVerified = time;
			}

			for (const key in film) {
				if(entity.hasOwnProperty(key)){
					if(typeof film[key] === 'string'){
						// If the string is empty, delete the property
						if(film[key] === '') { delete entity[key] } else { entity[key] = film[key] };
					} else if(typeof film[key] === 'number') {
						// If the number is zero, delete the property
						if(film[key] === 0) { delete entity[key] } else { entity[key] = film[key] };
					} else if(typeof film[key] === 'object' && film[key] instanceof Date) {
						// If the date and time equals 1994/04/27 00:00:00 UCT+2, delete the property
						if(new Date(film[key]).toISOString() === new Date(767397600000).toISOString()) {
							delete entity[key] 
						} else { 
							entity[key] = film[key] 
						};
					} else {
						entity[key] = film[key]
					}
				} else {
					entity[key] = film[key]
				}
			}
			
			const  dataAfter = {...entity}
			await this.db.update(entity);

			// console.log(JSON.stringify(film) === JSON.stringify(dataBefore))
			// console.log('DB4', dataBefore)
			// console.log('DAfter', dataAfter)

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: user,
				time: time,
				action: 'update',
				kind: 'Film',
				id: filmKey.id
			}
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
			const [film] = await this.db.get(filmKey);

			if(film.editLocked === true){ throw new BadRequestException('Edit locked') };

			deletion.push(film);

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
						pId: id,
						pKind: 'Film'
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
						pId: id,
						pKind: 'Film'
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

			results = await Promise.all(
				results.map(async (item) => {
					const userKey = this.db.key(['User', item.authorUid]);
					try {
						const [user] = await this.db.get(userKey);
						item.authorDisplayName = user?.displayName;
						if(!item.hasOwnProperty('publication')){
							item.publication = user?.publication
						}
						return {id: item[this.db.KEY]['id'], ...item}
					} catch (err : any){
						throw new NotFoundException(err.message)
					}
				})
			)
		
			return results
		} catch (err: any) {
			console.log(err)
			throw new NotFoundException()
		}
	}

	async findUnverifiedRatings(){
		const query = this.db.createQuery('Rating').filter('editVerified', '=', false).order('lastUpdated').limit(50);
		try {
			let [results] = await this.db.runQuery(query);

			results = await Promise.all(
				results.map(async (item) => {
					const parentKey = this.db.key([item.parentKind, +item.parentId]);
					try{
						const [parent] = await this.db.get(parentKey);
						return {
							id: item[this.db.KEY]['id'], 
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
				listRatings: info.totalRatings,
			} 
			await this.updateOne(updateRatings, opt.user, opt.parentId);

			return {id: entity[this.db.KEY]['id'], ...entity}
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	async deleteOneRating(opt: RatingOpt){
		const key = this.db.key(['Rating', +opt.ratingId]);

		const updateRatings: UpdateFilmDto = {
			listScore: 0,
			listRatings: 0
		}

		const userKey = this.db.key(['User', opt.user]);

		try {
			const [user] = await this.db.get(userKey);
			const [rating] = await this.db.get(key);

			if(rating.authorUid !== opt.user && user.role !== 'admin') {
				throw new BadRequestException('Action not allowed')
			}

			await this.updateOne(updateRatings, opt.user, opt.parentId);

			await this.db.delete(key);
			return {'status': 'deleted'}
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	async verifyRating(opt: RatingOpt){
		const updateRating: UpdateListRatingDto = {
			editVerified: true
		}
		try {
			const {entity, info} = await this.db.updateListRatingEntity(updateRating, opt);
			return entity;
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async uploadPoster(opt: ImageOpt, image: Express.Multer.File){
		const results = [];
		try {
			// Update the parent first
			const updateFilm: UpdateFilmDto = {
				hasPoster: true
			}
			if(opt.imageId !== '0'){ throw new BadRequestException('Unknown index') }

			await this.updateOne(updateFilm, opt.user, opt.parentId);

			// Update the poster
			const data = await this.storage.uploadPoster(image);
			const createPoster: CreatePosterDto = {
				...data
			}
			const {entity} = await this.db.createPosterEntity(createPoster, opt);

			return {id: entity.key.name, ...entity.data}
		} catch (err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updatePoster(data: UpdatePosterDto, opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updatePosterEntity(data, opt);

			return {id: entity[this.db.KEY]['name'], ...entity}
		} catch {
			throw new BadRequestException();
		}
	}

	async deletePoster(opt: ImageOpt){
		try{
			const updateFilm: UpdateFilmDto = {
				hasPoster: false
			}
			await this.updateOne(updateFilm, opt.user, opt.parentId);

			const posterKey = this.db.key([opt.parentKind, +opt.parentId, 'Poster', opt.imageId]);
			const [poster] = await this.db.get(posterKey);
			const historyObj: HistoryOpt = {
				dataObject: poster,
				user: opt.user,
				kind: 'Poster',
				id: posterKey.id,
				action: 'delete',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.storage.deletePoster(poster.originalName);
			await this.storage.deletePoster(poster.hdName);
			await this.storage.deletePoster(poster.sdName);
			await this.storage.deletePoster(poster.lqName);
			await this.db.createHistory(historyObj);
			await this.db.delete(posterKey)

			const searchRecord = {
				objectID: opt.parentId,
				posterUrl: null
			}
			await this.db.algolia.initIndex('films').partialUpdateObject(searchRecord, {}).wait();

			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async uploadStill(opt: ImageOpt, image: Express.Multer.File){
		try {
			if(opt.imageId !== '0' && opt.imageId !== '1' && opt.imageId !== '2'){ throw new BadRequestException('Unknown index') }

			const file = await this.storage.uploadStill(image);
			
			const creation: CreateStillDto = {
				...file
			}

			const {entity, history} = await this.db.createStillEntity(creation, opt);

			return { id: entity.key.name, ...entity.data }
		} catch (err: any ) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updateStill(data: UpdateStillDto, opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updateStillEntity(data, opt);

			return { id: entity[this.db.KEY]['name'], ...entity }
		} catch {
			throw new BadRequestException();
		}
	}

	async deleteStill(opt: ImageOpt){
		try{
			const updateFilm: UpdateFilmDto = {
				editVerified: false
			}
			await this.updateOne(updateFilm, opt.user, opt.parentId);

			const stillKey = this.db.key([opt.parentKind, +opt.parentId, 'Still', opt.imageId]);
			const [still] = await this.db.get(stillKey);
			const historyObj: HistoryOpt = {
				dataObject: still,
				user: opt.user,
				kind: 'Still',
				id:stillKey.id,
				action: 'delete',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
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
	async getFilmOfTheDay(){
		const time = new Date();
		const twelveMonthsAgo = new Date(Number(time)-(1000*60*60*24*365));
		const seventyTwoMonthsAgo = new Date(Number(time)-(1000*60*60*24*1825));
		const currentDay = new Date(time.toISOString().split('T')[0]);
		const fiveYearsAgo = new Date(seventyTwoMonthsAgo.toISOString().split('T')[0]);
		const queryFOTD =  this.db.createQuery('FOTD').filter('selectionDate', '=', currentDay);
		try {
			const [fotd] = await this.db.runQuery(queryFOTD);
			const filmOfTheDay = fotd[0];
			if(fotd.length < 1) {
				const filmsQuery = this.db.createQuery('Film')
					.filter('productionStage', '=', 'finished')
					.filter('hasPoster', '=', true)
					.filter('editVerified', '=', true)
					.filter('releaseDate', '<=', twelveMonthsAgo)
					.filter('editLocked', '=', true)
					.limit(300);
				let [films] = await this.db.runQuery(filmsQuery);
				if(films.length < 1){ throw new NotFoundException('No films found') }

				const queryAllFOTD = this.db.createQuery('FOTD').filter('selectionDate', '>=', fiveYearsAgo);
				const [allFotd] = await this.db.runQuery(queryAllFOTD);
				
				films = films.map((item) => {
					const filmId = item[this.db.KEY]['id'];

					const alreadySelected = allFotd.filter((value) => value.filmId = filmId);

					if(alreadySelected.length === 0){ return {...item, id: filmId} };
				})
				
				const selectedFilm = films[Math.floor(Math.random()*films.length)];
				
				const [poster] = await this.db.get(this.db.key(['Film', +selectedFilm.id, 'Poster', '0']));
				const [firstStill] = await this.db.get(this.db.key(['Film', +selectedFilm.id, 'Still', '0']));
				const [secondStill] = await this.db.get(this.db.key(['Film', +selectedFilm.id, 'Still', '1']));
				const [thirdStill] = await this.db.get(this.db.key(['Film', +selectedFilm.id, 'Still', '2']));
				const newFotdKey = this.db.key('FOTD');
				const entity = {
					key: newFotdKey,
					data: {
						selectionDate: currentDay,
						name: selectedFilm.name,
						id: selectedFilm.id,
						releaseDate: selectedFilm.releaseDate,
						poster: poster,
						logline: selectedFilm.logline,
						plotSummary: selectedFilm.plotSummary,
						genres: selectedFilm.genres,
						type: selectedFilm.type,
						format: selectedFilm.format,
						listScore: selectedFilm.listScore,
						stillOne: firstStill,
						stillTwo: secondStill,
						stillThree: thirdStill,
						year: selectedFilm.year,
						runtime: selectedFilm.runtime
					}
				}
				await this.db.insert(entity);
				return entity.data;
			}
			return filmOfTheDay;
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async getRecentlyAdded(limit?: number){
		let query = this.db.createQuery('Film').filter('hasPoster', '=', true).order('created', {descending: true}).limit(limit ? limit : 10);
		try {
			const films = await this.db.runQuery(query)

			const results = await Promise.all(films[0].map(async (film) => {
				film.id = film[this.db.KEY]['id']
				const posterKey = this.db.key(['Film', +film.id, 'Poster', '0']);

				try {
					const [poster] = await this.db.get(posterKey);
					if(!poster){
						return film
					} else {
						film.posterUrl = poster.sdUrl;
						return film
					}
				} catch {
					throw new BadRequestException()
				}
			}))
			return results
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async getLatestReleases(limit?: number){
		const now = new Date()
		let query = this.db.createQuery('Film')
			.filter('hasPoster', '=', true)
			.filter('productionStage', '=', 'finished')
			.filter('releaseDate', '<=', now)
			.order('releaseDate', {descending: true})
			.limit(limit ? limit : 10);
		try {
			const films = await this.db.runQuery(query)

			const results = await Promise.all(films[0].map(async (film) => {
				film.id = film[this.db.KEY]['id']
				const posterKey = this.db.key(['Film', +film.id, 'Poster', '0']);

				try {
					const [poster] = await this.db.get(posterKey);
					if(!poster){
						return film
					} else {
						film.posterUrl = poster.sdUrl;
						return film
					}
				} catch {
					throw new BadRequestException()
				}
			}))
			return results
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async getUpcoming(limit?: number){
		const now = new Date();
		const thisYear = now.getFullYear();
		const queryWithDate = this.db.createQuery('Film').filter('hasPoster', '=', true).filter('releaseDate', '>=', now).order('releaseDate').limit(limit ? limit : 10);
		const queryWithYear = this.db.createQuery('Film').filter('hasPoster', '=', true).filter('year', '>=', thisYear).order('year').order('lastUpdated').limit(50);
		try {
			let [filmsWithDate] = await this.db.runQuery(queryWithDate);			
			let [filmsWithYear] = await this.db.runQuery(queryWithYear);

			// filmsWithYear = filmsWithYear.filter((val) => filmsWithDate.indexOf(val) < 0);

			filmsWithDate = await Promise.all(filmsWithDate.map(async (film) => {
				film.id = film[this.db.KEY]['id'];
				delete film[this.db.KEY];
				const posterKey = this.db.key(['Film', +film.id, 'Poster', '0']);

				try {
					const [poster] = await this.db.get(posterKey);
					if(!poster){
						// console.log(JSON.stringify(film))
						return JSON.stringify(film)
					} else {
						film.posterUrl = poster.sdUrl;
						// console.log(JSON.stringify(film))
						return JSON.stringify(film)
					}
				} catch (err: any) {
					throw new BadRequestException()
				}
			}))

			filmsWithYear = await Promise.all(filmsWithYear.map(async (film) => {
				film.id = film[this.db.KEY]['id'];
				delete film[this.db.KEY];
				const posterKey = this.db.key(['Film', +film.id, 'Poster', '0']);

				try {
					const [poster] = await this.db.get(posterKey);
					if(!poster){
						// console.log(JSON.stringify(film))
						return JSON.stringify(film)
					} else {
						film.posterUrl = poster.sdUrl;
						// console.log(JSON.stringify(film))
						return JSON.stringify(film)
					}
				} catch {
					throw new BadRequestException()
				}
			}))

			// console.log(filmsWithDate)
			// console.log(filmsWithYear)

			const allItems = filmsWithDate.concat(filmsWithYear);
			// console.log(allItems)
			const results = allItems.filter((val, index) => {
				return allItems.indexOf(val) === index
			}).map((val) => JSON.parse(val))
			.slice(0, limit ? limit : 10).sort((a, b) => {
				if(a.year > b.year) {
					return 0
				} else {
					return -1
				}
			}).sort((a, b) => {
				if(a.created > b.created) {
					return 0
				} else {
					return -1
				}
			}).sort((a, b) => {
				if(a.releaseDate > b.releaseDate) {
					return 0
				} else {
					return -1
				}
			});

			return results;
		} catch(err: any){
			console.log(err)
			throw new NotFoundException()
		}
	}

	async getTrendingFilms(limit?: number){
		const sevenDaysAgo = new Date(Number(new Date)-(1000*60*60*24*7));
		try{
			const [hits] = await this.db.createQuery('Hit').filter('xKind', '=', 'Film').filter('time', '>', sevenDaysAgo).run();
			const occurrences = {};
			
			// Iterate through the hits
			hits.forEach(obj => {
				const filmId = obj.xId;
				
				// Increment the occurrence count for the film
				if (occurrences.hasOwnProperty(filmId)) {
					occurrences[filmId] += 1;
				} else {
					occurrences[filmId] = 1;
				}
			});

			const totalPairs: [string, number][] = Object.entries(occurrences);
			const limitedSet = totalPairs.sort((a, b) => b[1] - a[1]).slice(0, limit ? limit+1 : 10);

			const results = await Promise.all(limitedSet.map(async (pair) => {
				const id = pair[0];
				const filmKey = this.db.key(['Film', +id])
				const posterKey = this.db.key(['Film', +id, 'Poster', '0']);

				try {
					const [film] = await this.db.get(filmKey);
					const [poster] = await this.db.get(posterKey);
					if(!poster){
						return {...film, id: id}
					} else {
						film.posterUrl = poster.sdUrl;
						return {...film, id: id}
					}
				} catch {
					throw new BadRequestException()
				}
			}))

			return results;
		} catch(err: any){
			console.log(err)
			throw new NotFoundException()
		}
	}

	// Settings Methods
	async hideFilm(user: string, id: string){
		try {
			const updateFilm: UpdateFilmDto = {
				isHidden: true
			}
			const film = await this.updateOne(updateFilm, user, id);
			return film;
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async unhideFilm(user: string, id: string){
		try {
			const updateFilm: UpdateFilmDto = {
				isHidden: false
			}
			const film = await this.updateOne(updateFilm, user, id);
			return film;
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async verifyFilmEdit(user: string, id: string){
		try {
			const updateFilm: UpdateFilmDto = {
				editVerified: true
			}
			const film = await this.updateOne(updateFilm, user, id);
			return film
		} catch(err: any){
			console.log(err)
			throw new BadRequestException()
		}
	}

	async lockFilmEdit(user: string, id: string){
		try {
			const updateFilm: UpdateFilmDto = {
				editLocked: true
			}
			const film = await this.updateOne(updateFilm, user, id);
			return film;
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async unlockFilmEdit(user: string, id: string){
		try {
			const updateFilm: UpdateFilmDto = {
				editLocked: false
			}
			const film = await this.updateOne(updateFilm, user, id);
			return film;
		} catch(err: any){
			console.log(err)
			throw new BadRequestException()
		}
	}

	// History method [IN DEVELOPEMNT]
	async findHistory(filmId: string){
		const filmKey = this.db.key(['Film', +filmId]);
		try {
			const [film] = await this.db.get(filmKey); 

			const [stillsHistory] = await this.db.createQuery('History')
				.filter('xKind', '=', 'Still')
				.filter('wKind', '=', 'Film')
				.filter('wIdentifier', '=', filmId)
				.filter('xTimestamp', '>', new Date(film.lastVerified))
				.order('xTimestamp', {descending: true}).run();

			const [companiesHistory] = await this.db.createQuery('History')
				.filter('xKind', '=', 'CompanyRole')
				.filter('wKind', '=', 'Film')
				.filter('wIdentifier', '=', filmId)
				.filter('xTimestamp', '>', new Date(film.lastVerified))
				.order('xTimestamp', {descending: true}).run();

			const [peopleHistory] = await this.db.createQuery('History')
				.filter('xKind', '=', 'PersonRole')
				.filter('wKind', '=', 'Film')
				.filter('wIdentifier', '=', filmId)
				.filter('xTimestamp', '>', new Date(film.lastVerified))
				.order('xTimestamp', {descending: true}).run();

			const [filmHistory] = await this.db.createQuery('History')
				.filter('xKind', '=', 'Film')
				.filter('xIdentifier', '=', +filmId)
				.filter('xTimestamp', '>', new Date(film.lastVerified))
				.order('xTimestamp', {descending: true}).run();

			const [posterHistory] = await this.db.createQuery('History')
				.filter('xKind', '=', 'Poster')
				.filter('xIdentifier', '=', '0')
				.filter('wKind', '=', 'Film')
				.filter('wIdentifier', '=', filmId)
				.filter('xTimestamp', '>', new Date(film.lastVerified))
				.order('xTimestamp', {descending: true}).run();

			const allHistories = [
				...filmHistory, 
				...posterHistory, 
				...stillsHistory, 
				...companiesHistory, 
				...peopleHistory
			];

			const sortedHistory = await this.db.decodeHistory(allHistories);
			 // console.log('Sorted history', sortedHistory)
			return sortedHistory;
		} catch (err: any) {
			console.log(err)
			throw new NotFoundException(err.message)
		}
	}
}