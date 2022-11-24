import { Injectable, ParseFileOptions, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { 
	Film, 
	Poster, 
	Still,
	FilmType,
	ImageOpt
} from './films.types';
import {
	CreatePosterDto,
	UpdatePosterDto,
	CreateStillDto,
	UpdateStillDto,
	CreateFilmDto, 
	UpdateFilmDto 
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

	async findAll(): Promise<FilmType[]>{
		const query = this.db.createQuery('Film').limit(20)
		
		try {
			const films = await this.db.runQuery(query)
			console.log(films)
			// Loop through each film to retrieve its poster
			films[0].map(async (film: Film) => {
				film.id = film[this.db.KEY]['id']
				const posterQuery = this.db.createQuery('Poster')
					.filter('film', '=', film.name)
					.filter('quality', '=', 'SD')
					.limit(1);
				const [poster] = await this.db.runQuery(posterQuery);
				console.log(poster)
				if(!poster.length){
					return film
				}
				const wholeFilm = {
					...film,
					posterUrl: poster[0]['url']
				}
				return wholeFilm
			})
			console.log(films[0])
			return films[0]
		} catch (err: any) {
			console.log(err)
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findOne(id: string): Promise<FilmType>{
		const filmKey = this.db.key(['Film', +id]);
		// Create queries
		const postersQuery = this.db.createQuery('Poster')
			.hasAncestor(filmKey)
			.filter('quality', '=', 'HD')
			.order('created', {descending: true})
			.limit(1);
		const linksQuery =this.db.createQuery('Link')
			.hasAncestor(filmKey)
			.order('created', {descending: true});
		const stillsQuery = this.db.createQuery('Still')
			.hasAncestor(filmKey)
			.filter('quality','=', 'HD')
			.order('created', {descending: true})
			.limit(3);
		const distributorsQuery = this.db.createQuery('CompanyRole')
			.hasAncestor(filmKey)
			.filter('type', '=', 'distribution')
			.order('companyName');
		const producersQuery = this.db.createQuery('CompanyRole')
			.hasAncestor(filmKey)
			.filter('type', '=', 'production')
			.order('companyName');
		const actorsQuery = this.db.createQuery('PersonRole')
			.hasAncestor(filmKey)
			.filter('category', '=', 'talent')
			.order('personName');
		const crewQuery = this.db.createQuery('PersonRole')
			.hasAncestor(filmKey)
			.filter('category', '=', 'crew')
			.order('title');

		try {
			// Run queries
			const [details] = await this.db.get(filmKey);
			// Check whether the film is public or deleted before continuing
			const [platformLinks] =  await this.db.runQuery(linksQuery);
			const [poster] = await this.db.runQuery(postersQuery);
			const [stills] = await this.db.runQuery(stillsQuery);
			const [distributors] = await this.db.runQuery(distributorsQuery);
			const [producers] = await this.db.runQuery(producersQuery);
			const [actors] = await this.db.runQuery(actorsQuery);
			const [crew] = await this.db.runQuery(crewQuery);

			// Extact the entity id/name from query to expose to the client
			details.id = details[this.db.KEY]["id"]
			details.poster = poster[0]

			distributors.map(async (item: CompanyRole) => {
				const key = this.db.key(['Company', +item.companyId])
				const [company] = await this.db.get(key)
				return {
					...item,
					photoUrl: company.profilePhotoUrl
				}
			})
			
			producers.map(async (item: CompanyRole) => {
				const key = this.db.key(['Company', +item.companyId])
				const [company] = await this.db.get(key)
				return {
					...item,
					photoUrl: company.profilePhotoUrl
				}
			})

			actors.map(async (item: PersonRole) => {
				const key = this.db.key(['Company', +item.personId])
				const [person] = await this.db.get(key)
				return {
					...item,
					photoUrl: person.profilePhotoUrl
				}
			})

			crew.map(async (item: PersonRole) => {
				const key = this.db.key(['Company', +item.personId])
				const [person] = await this.db.get(key)
				return {
					...item,
					photoUrl: person.profilePhotoUrl
				}
			})

			const film: FilmType = {
				details: details,
				stills: stills as Still[],
				producers: producers,
				distributors: distributors,
				platforms: platformLinks,
				actors: actors,
				crew: crew
			}

			return film
		} catch(err: any){
			console.log(err)
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
		const entity = {
			key: filmKey,
			data: film
		}
		console.log(filmKey.id)
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
			console.log(entity)
			console.log(history)
			return { 'status': 'created', 'film_id': filmKey.id }
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(film: UpdateFilmDto, user: string, id: string){
		const time = new Date()
		const filmKey = this.db.key(['Film', +id]);		
		film.lastUpdated = time;
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
			return { id: filmKey.id, ...entity };
		} catch(err: any){
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
			await this.db.createHistory(historyObj);
			await this.db.transaction().delete(deletion);
			return {'status': 'deleted'}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async uploadPoster(opt: ImageOpt, image: Express.Multer.File){
		const results = [];
		try {
			const data = await this.storage.uploadPoster(image)
			data.forEach(async (file) => {
				const creation: CreatePosterDto = {
					url: file.url,
					originalName: file.originalName,
					quality: file.quality
				}
				const {entity, history} = await this.db.createPosterEntity(creation, opt);

				if(file.quality == 'HD'){
					results.push({
						id: entity.key.id,
						...entity.data
					})
				}

				return results[0]
			})
			return {}
		} catch (err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updatePoster(data: UpdatePosterDto, opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updatePosterEntity(data, opt);
			return {id: entity[this.db.KEY]['id'], ...entity}
		} catch {
			throw new BadRequestException();
		}
	}

	async deletePoster(opt: ImageOpt){
		try{
			const posterKey = this.db.key([opt.parentKind, +opt.parentId, 'Poster', +opt.imageId]);
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
			await this.db.createHistory(historyObj);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async uploadStill(opt: ImageOpt, image: Express.Multer.File){
		try {
			const file = await this.storage.uploadStill(image);
			
			const creation: CreatePosterDto = {
				url: file.url,
				originalName: file.originalName,
				quality: file.quality,
			}

			const {entity, history} = await this.db.createStillEntity(creation, opt);
			return { id: entity.key.id, ...entity.data }
		} catch{
			throw new BadRequestException()
		}
	}

	async updateStill(data: UpdateStillDto, opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updateStillEntity(data, opt);
			return { id: entity[this.db.KEY]['id'], ...entity }
		} catch {
			throw new BadRequestException();
		}
	}

	async deleteStill(opt: ImageOpt){
		try{
			const stillKey = this.db.key([opt.parentKind, +opt.parentId, 'Still', +opt.imageId]);
			const [still] = await this.db.get(stillKey);
			const historyObj: HistoryOpt = {
				dataObject: still,
				user: opt.user,
				kind: 'Still',
				id:stillKey.id,
				action: 'delete',
				time: opt.time,
			}
	
			await this.storage.deletePoster(still.originalName);
			await this.db.createHistory(historyObj);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}
}