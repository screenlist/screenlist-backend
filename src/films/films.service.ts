import { Injectable, ParseFileOptions, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { CreateFilmDto, UpdateFilmDto } from './films.dto';
import { 
	FilmDetails, 
	Poster, 
	Still,
	FilmType,
	ImageOpt
} from './films.types';
import {
	CreatePosterDto,
	UpdatePosterDto,
	CreateStillDto,
	UpdateStillDto
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
import { PeopleService } from '../people/people.service';
import { StorageService } from '../storage/storage.service';
import { HistoryOpt } from '../database/database.types';



@Injectable()
export class FilmsService {
	constructor(
		private configService: ConfigService,
		private db: DatabaseService,
		private storage: StorageService,
	){
		this.db = new DatabaseService(configService)
		this.storage = new StorageService(configService)
	}

	async findAll(): Promise<FilmType[]>{
		const query = this.db.createQuery('Film').filter('status', '=', 'public').limit(20)
		const results: FilmType[] = []
		try {
			const films = await this.db.runQuery(query)
			// Loop through each film to retrieve its poster
			films[0].forEach(async (film: FilmDetails) => {
				film.id = film[this.db.KEY]['id']
				const posterQuery = this.db.createQuery('Poster')
					.filter('film', '=', film.name)
					.filter('quality', '=', 'SD')
					.limit(1);
				const posters = await this.db.runQueryFull(posterQuery);
				const wholeFilm: FilmType = {
					details: film,
					posters: posters[0] as Poster[]
				}
				results.push(wholeFilm);
			})
			return results
		} catch {
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
			const details = await this.db.get(filmKey);
			// Check whether the film is public or deleted before continuing
			if(details[0].status != "public"){
				throw new NotFoundException("Not available");
			}
			const platformLinks: Link[] =  await this.db.runQueryFull(linksQuery);
			const poster = await this.db.runQuery(postersQuery);
			const stills = await this.db.runQuery(stillsQuery);
			const distributors: CompanyRole[] = await this.db.runQueryFull(distributorsQuery);
			const producers: CompanyRole[] = await this.db.runQueryFull(producersQuery);
			const actors: PersonRole[] = await this.db.runQueryFull(actorsQuery);
			const crew: PersonRole[] = await this.db.runQueryFull(crewQuery);

			// Extact the entity id/name from query to expose to the client
			details.map(obj => {
				obj.id = obj[this.db.KEY]["id"]
				return obj
			})

			const film: FilmType = {
				details: details[0],
				posters: poster[0] as Poster[],
				stills: stills[0] as Still[],
				producers: producers,
				distributors: distributors,
				platforms: platformLinks,
				actors: actors,
				crew: crew
			}

			return film
		} catch(err: any){
			throw new NotFoundException("Could not retrieve film");
		}
	}

	async createOne(film: CreateFilmDto, user: string){
		// A variable to house all entities created
		let entities = []
		// Creates the film details entity
		const filmKey = this.db.key('Film');
		const filmName = film.name;
		const time = new Date();
		film.slug = filmName.concat("-"+filmKey.id.toString());
		film.lastUpdated = time;
		film.created = time;
		film.status = "public";
		entities.push({
			key: filmKey,
			data: film
		})
		// Write film action into history
		entities.push(this.db.formulateHistory(film, 'Film',	filmKey.id,	user,	'create'));

		try {
			await this.db.transaction().insert(entities);
			return {"status": "successfully created"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(film: UpdateFilmDto, user: string, id: string){
		const time = new Date()
		const filmKey = this.db.key(['Film', +id]);
		
		if(film.name || film.slug){
			film.slug = film.name.concat("-"+filmKey.id);
		}
		
		film.lastUpdated = time
		const entity = {
			key: filmKey,
			data: film
		}
		// Create history
		const history = this.db.formulateHistory(film, 'Film', filmKey.id, user, 'update');
		try{
			await this.db.transaction().update(entity);
			await this.db.transaction().insert(history);
			return { 'status': 'successfully updated' };
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(id: string, user: string){
		const deletion = []
		const history = []
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
						data: poster,
						user: user,
						kind: 'Poster',
						id: poster[this.db.KEY]['id'],
						action: 'delete',
						time: time,
					}
					history.push(this.db.formulateHistory(historyObj));
				}
			})
			stills.forEach(async (still: Still) => {
				const removal = await this.storage.deletePoster(still.originalName);
				if(removal){
					deletion.push(still);
					const historyObj: HistoryOpt = {
						data: still,
						user: user,
						kind: 'Still',
						id: still[this.db.KEY]['id'],
						action: 'delete',
						time: time,
					}
					history.push(this.db.formulateHistory(historyObj));
				}
			})

			const [links] = await this.db.runQuery(linksQuery);
			const [companiesRoles] = await this.db.runQuery(companiesRolesQuery);
			const [peopleRoles] = await this.db.runQuery(peopleRolesQuery);

			links.forEach((link: Link) => {
				deletion.push(link);
				const historyObj: HistoryOpt = {
					data: link,
					user: user,
					kind: 'Link',
					id: link[this.db.KEY]['id'],
					action: 'delete',
					time: time,
				}
				history.push(this.db.formulateHistory(historyObj));
			})
			companiesRoles.forEach((role: CompanyRole) => {
				deletion.push(role);
				const historyObj: HistoryOpt = {
					data: role,
					user: user,
					kind: 'CompanyRole',
					id: role[this.db.KEY]['id'],
					action: 'delete',
					time: time,
				}
				history.push(this.db.formulateHistory(historyObj));
			})
			peopleRoles.forEach((role: PersonRole) => {
				deletion.push(role);
				const historyObj: HistoryOpt = {
					data: role,
					user: user,
					kind: 'PersonRole',
					id: role[this.db.KEY]['id'],
					action: 'delete',
					time: time
				}
				history.push(this.db.formulateHistory(historyObj));
			})
			const [film] = await this.db.get(filmKey);
			await this.db.delete(film);
			// Write action into history
			const historyObj: HistoryOpt = {
				data: film,
				user: user,
				kind: 'Still',
				id: filmKey.id,
				action: 'delete',
				time: time,
			}
			history.push(this.db.formulateHistory(historyObj));
			await this.db.transaction().insert(history);
			return {'status': 'deleted'}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async uploadPoster(info: CreatePosterDto, opt: ImageOpt, image: Express.Multer.File){
		const insertion = []
		const time = new Date();
		try {
			const data = await this.storage.uploadPoster(image)
			data.forEach((file) => {
				const creation: CreatePosterDto = {
					url: file.url,
					originalName: file.originalName,
					quality: file.quality,
					description: info.description,
				}
				const {entity, history} = this.db.createPosterEntity(creation, opt);
				insertion.push(entity, history);
			})
			await this.db.transaction().insert(insertion);
			return {'status': 'uploaded'}
		} catch{
			throw new BadRequestException("Could not upload")
		}
	}

	async deletePoster(opt: ImageOpt){
		try{
			const posterKey = this.db.key([opt.parentKind, +opt.parentId, 'Poster', +opt.imageId]);
			const [poster] = await this.db.get(posterKey);
			const historyObj: HistoryOpt = {
				data: poster,
				user: opt.user,
				kind: 'Poster',
				id: posterKey.id,
				action: 'delete',
				time: opt.time,
			}
			const history = this.db.formulateHistory(historyObj)
			await this.storage.deletePoster(poster.originalName);
			await this.db.insert(history);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException('Could not delete')
		}
	}

	async uploadStill(info: CreateStillDto, opt: ImageOpt, image: Express.Multer.File){
		const insertion = []
		const time = new Date();
		try {
			const file = await this.storage.uploadStill(image);
			
			const creation: CreatePosterDto = {
				url: file.url,
				originalName: file.originalName,
				quality: file.quality,
				description: info.description,
			}

			const {entity, history} = this.db.createStillEntity(creation, opt);
			insertion.push(entity, history);
			await this.db.transaction().insert(insertion);
			return {'status': 'uploaded'}
		} catch{
			throw new BadRequestException("Could not upload")
		}
	}

	async deleteStill(opt: ImageOpt){
		try{
			const stillKey = this.db.key([opt.parentKind, +opt.parentId, 'Still', +opt.imageId]);
			const [still] = await this.db.get(stillKey);
			const historyObj: HistoryOpt = {
				data: still,
				user: opt.user,
				kind: 'Still',
				id:stillKey.id,
				action: 'delete',
				time: opt.time,
			}
			const history = this.db.formulateHistory(historyObj)
			await this.storage.deletePoster(still.originalName);
			await this.db.insert(history);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException('Could not delete')
		}
	}
}