import { Injectable, ParseFileOptions, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { CreateFilmDto, UpdateFilmDto } from './films.dto';
import { 
	FilmDetails, 
	Poster, 
	Still,
	FilmType
} from './films.types';
import {
	Company,
	CompanyRole
} from '../companies/companies.types';
import {
	Link,
	Platform,
} from '../platforms/platforms.types';
import {
	Person,
	PersonRole,
} from '../people/people.types';


@Injectable()
export class FilmsService {
	constructor(
		private configService: ConfigService,
		private datastore: DatabaseService
	){
		this.datastore = new DatabaseService(configService)
	}

	async findAll(): Promise<FilmType[]>{
		const query = this.datastore.createQuery('Film').filter('status', '=', 'public').limit(20)
		const results: FilmType[] = []
		try {
			const films = await this.datastore.runQuery(query)
			// Loop through each film to retrieve its poster
			films[0].forEach(async (film: FilmDetails) => {
				film.id = film[this.datastore.KEY]['id']
				const posterQuery = this.datastore.createQuery('Poster')
					.filter('film', '=', film.name)
					.filter('quality', '=', 'SD')
					.limit(1);
				const posters = await this.datastore.runQueryFull(posterQuery);
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
		const filmKey = this.datastore.key(['Film', +id]);
		// Create queries
		const postersQuery = this.datastore.createQuery('Poster')
			.hasAncestor(filmKey)
			.filter('quality', '=', 'HD')
			.order('created', {descending: true})
			.limit(1);
		const linksQuery =this.datastore.createQuery('Link')
			.hasAncestor(filmKey)
			.order('created', {descending: true});
		const stillsQuery = this.datastore.createQuery('Still')
			.hasAncestor(filmKey)
			.filter('quality','=', 'HD')
			.order('created', {descending: true})
			.limit(3);
		const distributorsQuery = this.datastore.createQuery('CompanyRole')
			.hasAncestor(filmKey)
			.filter('type', '=', 'distribution')
			.order('companyName');
		const producersQuery = this.datastore.createQuery('CompanyRole')
			.hasAncestor(filmKey)
			.filter('type', '=', 'production')
			.order('companyName');
		const actorsQuery = this.datastore.createQuery('PersonRole')
			.hasAncestor(filmKey)
			.filter('category', '=', 'talent')
			.order('personName');
		const crewQuery = this.datastore.createQuery('PersonRole')
			.hasAncestor(filmKey)
			.filter('category', '=', 'crew')
			.order('title');

		try {
			// Run queries
			const details = await this.datastore.get(filmKey);
			// Check whether the film is public or deleted before continuing
			if(details[0].status != "public"){
				throw new NotFoundException("Not available");
			}
			const platformLinks: Link[] =  await this.datastore.runQueryFull(linksQuery);
			const poster = await this.datastore.runQuery(postersQuery);
			const stills = await this.datastore.runQuery(stillsQuery);
			const distributors: CompanyRole[] = await this.datastore.runQueryFull(distributorsQuery);
			const producers: CompanyRole[] = await this.datastore.runQueryFull(producersQuery);
			const actors: PersonRole[] = await this.datastore.runQueryFull(actorsQuery);
			const crew: PersonRole[] = await this.datastore.runQueryFull(crewQuery);

			// Extact the entity id/name from query to expose to the client
			details.map(obj => {
				obj.id = obj[this.datastore.KEY]["id"]
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
		const filmKey = this.datastore.key('Film');
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
		entities.push(this.datastore.formulateHistory(film, 'Film',	filmKey.id,	user,	'create'));

		try {
			await this.datastore.transaction().insert(entities);
			return {"status": "successfully created"}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(film: UpdateFilmDto, user: string){
		const transactionId = (new Date()).toISOString().concat('-updated-film-'+film.details.name);
		const transactionHistoryId = transactionId+"-history";
		const time = new Date()
		let history = [] // Where to put all history entities
		let entities = [] // Where to put all entities needing an update
		const filmKey = this.datastore.key(['Film', film.id]);
		const state = await this.datastore.get(filmKey) // to check if the film really exists
		if(state.length !>= 1 && isNaN(state[0]) == false){
			throw new NotFoundException('This film does not exist')
		}
		if(film.details.name && state[0].nameEditable == false){
			throw new UnauthorizedException('You are not authorised to edit the film name');
		}
		if(film.details.slug){
			throw new UnauthorizedException('You are not authorised to edit the slug');
		}
		delete film.details.id; // deletes the id from entity
		if(Object.keys(film.details).length >= 1){
			film.details.lastUpdated = time
			entities.push({
				key: filmKey,
				data: film.details
			})

			// Create history
			history.push(this.datastore.formulateHistory(film.details, 'Film', filmKey.id, user, 'update'));
		}

		try{
			await this.datastore.transaction().update(entities);
			await this.datastore.transaction().insert(history);
			return { 'status': 'successfully updated' };
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(id: string, user: string){
		const filmKey = this.datastore.key(['Film', +id]);
		try {
			const [film] = await this.datastore.get(filmKey);
			await this.datastore.delete(film);
			delete film[this.datastore.KEY]
			// Write action into history
			const history = this.datastore.formulateHistory(film, filmKey.id, 'Film', user, 'delete');
			await this.datastore.insert(history);
			return {'status': 'deleted'}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}
}