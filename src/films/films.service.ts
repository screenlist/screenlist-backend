import { Injectable, ParseFileOptions, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { CreateFilmDto, UpdateFilmDto, GetFilmDto } from './films.dto';
import { 
	FilmDetails, 
	Company,
	CompanyRole, 
	Poster, 
	Still, 
	PersonRole, 
	Person,
	Link,
	Platform
} from './films.types'


@Injectable()
export class FilmsService {
	constructor(
		private configService: ConfigService,
		private datastore: DatabaseService
	){
		this.datastore = new DatabaseService(configService)
	}

	async findAll(): Promise<GetFilmDto[]>{
		const query = this.datastore.createQuery('Film').limit(20)
		const results: GetFilmDto[] = []
		try {
			const films = await this.datastore.runQuery(query)
			// Loop through each film to retrieve its poster
			films[0].forEach(async (film: FilmDetails) => {
				const posterQuery = this.datastore.createQuery('Poster')
					.filter('film', '=', film.name)
					.filter('quality', '=', 'SD')
					.limit(1);
				const posters = await this.datastore.runQuery(posterQuery);
				const wholeFilm: GetFilmDto = {
					details: film,
					posters: posters[0] as GetFilmDto["posters"]
				}
				results.push(wholeFilm);
			})
			return results
		} catch {
			throw new NotFoundException("Encountered trouble while trying to retrieve");
		}
	}

	async findOne(id: number): Promise<any>{
		const filmKey = this.datastore.key(['Film', id]);
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
			.order('title')

		try {
			// Run queries
			const details = await this.datastore.get(filmKey);
			const platformLinks =  await this.datastore.runQuery(linksQuery);
			const poster = await this.datastore.runQuery(postersQuery);
			const stills = await this.datastore.runQuery(stillsQuery);
			const distributors = await this.datastore.runQuery(distributorsQuery);
			const producers = await this.datastore.runQuery(producersQuery);
			const actors = await this.datastore.runQuery(actorsQuery);
			const crew = await this.datastore.runQuery(crewQuery);

			const film = {
				details: details,
				posters: poster,
				stills: stills,
				productionCompanies: producers,
				distributionCompanies: distributors,
				currentPlatforms: platformLinks,
				actors: actors,
				crew: crew
			}

			return film
		} catch(err: any){
			throw new NotFoundException("Could not retrieve film");
		}
	}

	async create(film: CreateFilmDto){
		const transactionId = (new Date()).toISOString().concat("-create-film-"+film.details.name);
		// A variable to house all entities created
		let entities = []
		// Creates the film details entity
		const filmKey = this.datastore.key('Film');
		const filmName = film.details.name;
		const time = new Date();
		film.details.slug = filmName.concat("-"+filmKey.id.toString());
		film.details.lastUpdated = time;
		film.details.created = time;
		entities.push({
			key: filmKey,
			data: film.details
		})
		// Creates poster entities
		film.posters.forEach(poster => {
			const posterKey = this.datastore.key(['Film', filmKey.id, 'Poster', poster.originalName]);
			poster.lastUpdated = time;
			poster.created = time;
			entities.push({
				key: posterKey,
				data: poster
			})
		})
		// Creates still frame entities
		film.stillFrames.forEach(frame => {
			const stillKey = this.datastore.key(['Film', filmKey.id, 'Poster', frame.originalName]);
			frame.lastUpdated = time;
			frame.created = time;
			entities.push({
				key: stillKey,
				data: frame
			})
		})
		// Creates person role entities
		film.credits.forEach(async (role) => {
			role.lastUpdated = time;
			role.created = time;
			role.film = filmName
			// Checks whether the person in question already exists
			if(role.personId){
				// Checks whether the person id real or bogus
				const personKey = this.datastore.key(['Person', role.personId])
				const person = await this.datastore.get(personKey)
				if(person.length >= 1 && isNaN(person[0])){
					// Creates the role for this existing person
					const roleKey = this.datastore.key(['Person', personKey.id,'Film', filmKey.id, 'PersonRole']);
					entities.push({
						key: roleKey,
						data: role
					})
				}
			} else {
				// Creates the role and a new person
				const personKey = this.datastore.key('Person')
				const personEntity: Person = {
					name: role.personName,
					lastUpdated: time,
					created: time,
				}
				entities.push({
					key: personKey,
					data: personEntity
				})
				const roleKey = this.datastore.key(['Person', personKey.id,'Film', filmKey.id, 'PersonRole']);
				entities.push({
					key: roleKey,
					data: role
				})
			}
		})
		// Creates company role entities
		film.companies.forEach(async (role) => {
			role.lastUpdated = time;
			role.created = time;
			role.film = filmName;
			// Checks whether the company in question already exist
			if(role.companyId){
				// Checks whether the company id real or bogus
				const companyKey = this.datastore.key(['Company', role.companyId]);
				const company = await this.datastore.get(companyKey);
				if(company.length >= 1 && isNaN(company[0])){
					const roleKey = this.datastore.key(['Company', companyKey.id,'Film', filmKey.id, 'CompanyRole']);
					entities.push({
						key: companyKey,
						data: role
					})
				}
			} else {
				// Create the role and a new company
				const companyKey = this.datastore.key(['Company', role.companyId]);
				const companyEntity: Company = {
					name: role.companyName,
					website: role.website,
					lastUpdated: time,
					created: time,
				} 
				entities.push({
					key: companyKey,
					data: companyEntity
				})
				const roleKey = this.datastore.key(['Company', companyKey.id,'Film', filmKey.id, 'CompanyRole']);
				entities.push({
					key: companyKey,
					data: role
				})
			}
		})

		film.currentPlatforms.forEach(async (link) => {
			link.lastUpdated = time;
			link.created = time;
			// Checks whether the platform in question already exist
			if(link.platformId){
				// Checks whether the platform id real or bogus
				const platformKey = this.datastore.key(['Platform', link.platformId]);
				const platform = await this.datastore.get(platformKey);
				if(platform.length >= 1 && isNaN(platform[0])){
					const linkKey = this.datastore.key(['Platform', platformKey.id, 'Film', filmKey.id, 'Link']);
					entities.push({
						key: linkKey,
						data: link
					})
				}
			} else {
				// Creates a link and a new platform
				const platformKey = this.datastore.key('Platform');
				const platform: Platform = {
					name: link.platformName,
					lastUpdated: time,
					created: time
				}
				entities.push(platform)
				const linkKey = this.datastore.key(['Platform', platformKey.id, 'Film', filmKey.id, 'Link']);
				entities.push({
					key: linkKey,
					data: link
				})
			}
		})

		try {
			await this.datastore.transaction({ id: transactionId }).insert(entities);
			return {"status": "successfully created"}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}
}