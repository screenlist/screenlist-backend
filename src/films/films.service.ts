import { Injectable, ParseFileOptions, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

	async findAll(user: string): Promise<GetFilmDto[]>{
		const query = this.datastore.createQuery('Film').filter('status', '=', 'public').limit(20)
		const results: GetFilmDto[] = []
		try {
			const films = await this.datastore.runQuery(query)
			// Loop through each film to retrieve its poster
			films[0].forEach(async (film: FilmDetails) => {
				film.id = film[this.datastore.KEY]['id']
				const posterQuery = this.datastore.createQuery('Poster')
					.filter('film', '=', film.name)
					.filter('quality', '=', 'SD')
					.limit(1);
				const posters = await this.datastore.runQuery(posterQuery);
				posters[0].map(obj => {
					obj.id = obj[this.datastore.KEY]['id']
					return obj
				})
				const wholeFilm: GetFilmDto = {
					details: film,
					posters: posters[0] as GetFilmDto['posters']
				}
				results.push(wholeFilm);
			})
			return results
		} catch {
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findOne(id: number, user: string): Promise<any>{
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
			.order('title');

		try {
			// Run queries
			const details = await this.datastore.get(filmKey);
			// Check whether the film is public or deleted before continuing
			if(details[0].status != "public"){
				throw new NotFoundException("Not available");
			}
			const platformLinks =  await this.datastore.runQuery(linksQuery);
			const poster = await this.datastore.runQuery(postersQuery);
			const stills = await this.datastore.runQuery(stillsQuery);
			const distributors = await this.datastore.runQuery(distributorsQuery);
			const producers = await this.datastore.runQuery(producersQuery);
			const actors = await this.datastore.runQuery(actorsQuery);
			const crew = await this.datastore.runQuery(crewQuery);

			// Extact the entity id/name from query to expose to the client
			details[0].map(obj => {
				obj.id = obj[this.datastore.KEY]["id"]
				return obj
			})
			platformLinks[0].map(obj => {
				obj.id = obj[this.datastore.KEY]['id']
				return obj
			})
			distributors[0].map(obj => {
				obj.id = obj[this.datastore.KEY]['id']
				return obj
			})
			producers[0].map(obj => {
				obj.id = obj[this.datastore.KEY]['id']
				return obj
			})
			actors[0].map(obj => {
				obj.id = obj[this.datastore.KEY]['id']
				return obj
			})
			crew[0].map(obj => {
				obj.id = obj[this.datastore.KEY]['id']
				return obj
			})

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

	async createOne(film: CreateFilmDto, user: string){
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
		film.details.status = "public"
		film.details.nameEditable = true;
		entities.push({
			key: filmKey,
			data: film.details
		})
		// Write film action into history
		entities.push(this.datastore.formulateHistory(film.details, 'Film',	filmKey.id,	user,	'create'));

		// Creates poster entities
		film.posters.forEach(poster => {
			const posterEntity = this.datastore.createPosterEntity(poster, filmKey.id, time, 'Film');
			entities.push(posterEntity)
			// Write poster action into history
			entities.push(this.datastore.formulateHistory(poster,	'Poster',	posterEntity.key.name,	user,	'create'));
		})
		// Creates still frame entities
		film.stillFrames.forEach(frame => {
			const still = this.datastore.createStillEntity(frame, filmKey.id, time, 'Film');
			entities.push(still)
			// Write film action into history
			entities.push(this.datastore.formulateHistory(frame, 'Still', still.key.name, user, 'create'));
		})
		// Creates person role entities
		film.credits.forEach(async (role) => {
			const data = await this.datastore.createPersonRoleEntity(role, filmKey.id, time, user, 'Film');
			entities.push(...data.entities);
			entities.push(...data.history);
		})
		// Creates company role entities
		film.companies.forEach(async (role) => {
			const data = await this.datastore.createCompanyRoleEntity(role, filmKey.id, time, user, 'Film');
			entities.push(...data.entities);
			entities.push(...data.history);
		})

		film.currentPlatforms.forEach(async (link) => {
			const data = await this.datastore.createLinkEntity(link, filmKey.id, time, user, 'Film');
			entities.push(...data.entities);
			entities.push(...data.history);
		})

		try {
			await this.datastore.transaction({ id: transactionId }).insert(entities);
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
		const filmKey = this.datastore.key(['Film', film.details.id]);
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

		// Updates posters
		if(film.posters && film.posters.length <= 2){
			film.posters.forEach((poster) => {
				const posterKey = this.datastore.key(['Film', filmKey.id, 'Poster', poster.url]);
				poster.lastUpdated = time;
				entities.push({
					key: posterKey,
					data: poster
				})

				// Create history
				history.push(this.datastore.formulateHistory(
					poster,
					'Poster',
					posterKey.name,
					user,
					'update'
				))
			})
		}

		// Updates stills
		if(film.stillFrames && film.stillFrames.length <= 3){
			film.stillFrames.forEach((still) => {
				const stillKey = this.datastore.key(['Film', filmKey.id, 'Still', still.url]);
				still.lastUpdated = time;
				entities.push({
					key: stillKey,
					data: still
				})

				history.push(this.datastore.formulateHistory(
					still,
					'Still',
					stillKey.name,
					user,
					'update'
				))
			})
		}

		// Updates company roles
		if(film.companies){
			film.companies.forEach(async (role) => {
				// For company role of an existing company
				// Doesn't allow to edit the name of an existing company
				if(!role.companyName && role.companyId){
					const companyKey = this.datastore.key(['Company', role.companyId]);
					const company = await this.datastore.get(companyKey);
					if(company.length >= 1 && isNaN(company[0])){
						if(role.id){
							// Edits an existing company role of an exsiting company
							const roleKey = this.datastore.key(['Company', companyKey.id,'Film', filmKey.id,'CompanyRole', role.id])
							delete role.id;
							delete role.companyId;
							role.lastUpdated = time;
							entities.push({
								key: roleKey,
								data: role
							})

							// Creates history
							history.push(this.datastore.formulateHistory(
								role,
								'CompanyRole',
								roleKey.id,
								user,
								'update'
							))
						} else if(!role.id){
							// Adds a new company role of an exisiting compny
							const roleKey = this.datastore.key(['Company', companyKey.id,'Film', filmKey.id, 'CompanyRole']);
							delete role.companyId;
							role.created = time;
							role.lastUpdated = time;
							entities.push({
								key: roleKey,
								data: role
							})

							// Creates history
							history.push(this.datastore.formulateHistory(
								role,
								'CompanyRole',
								roleKey.id,
								user,
								'update'
							))
						}
					} 
				} else if(role.companyName && !role.companyId && !role.id && role.type){
					// Creates a new company and a new company role
					// That's only if the role has a type
					const companyKey = this.datastore.key('Company');
					const companyEntity: Company = {
						name: role.companyName,
						nameEditable: true,
						website: role.website,
						lastUpdated: time,
						created: time,
					}
					entities.push({
						key: companyKey,
						data: companyEntity
					})
					const roleKey = this.datastore.key(['Company', companyKey.id,'Film', filmKey.id,'CompanyRole'])
					role.created = time;
					role.lastUpdated = time;
					entities.push({
						key: roleKey,
						data: role
					})

					// Creates history for both actions
					history.push(this.datastore.formulateHistory(
						companyEntity,
						'Company',
						companyKey.id,
						user,
						'create'
					))
					history.push(this.datastore.formulateHistory(
						role,
						'CompanyRole',
						roleKey.id,
						user,
						'update'
					))
				} else {
					throw new BadRequestException("Something is not right in this edit, make sure you've filled all required fields")
				}
			})
		}

		// Updates person roles
		if(film.credits){
			film.credits.forEach(async (role) => {
				// For person role of an existing person
				// Doesn't allow to edit the name of an existing person
				if(!role.personName && role.personId){
					const personKey = this.datastore.key(['Person', role.personId]);
					const person = await this.datastore.get(personKey);
					if(person.length >= 1 && isNaN(person[0])){
						if(role.id){
							// Edits an existing person role of an exsiting person
							const roleKey = this.datastore.key(['Person', personKey.id,'Film', filmKey.id,'PersonRole', role.id])
							delete role.id;
							delete role.personId;
							role.lastUpdated = time;
							entities.push({
								key: roleKey,
								data: role
							})

							// Creates history
							history.push(this.datastore.formulateHistory(
								role,
								'PersonRole',
								roleKey.id,
								user,
								'update'
							))
						} else if(!role.id){
							// Adds a new person role of an exisiting person
							const roleKey = this.datastore.key(['Person', personKey.id,'Film', filmKey.id, 'PersonRole']);
							delete role.personId;
							role.created = time;
							role.lastUpdated = time;
							entities.push({
								key: roleKey,
								data: role
							})

							// Creates history
							history.push(this.datastore.formulateHistory(
								role,
								'PersonRole',
								roleKey.id,
								user,
								'update'
							))
						}
					} 
				} else if(role.personName && !role.personId && !role.id && role.category){
					// Creates a new person and a new person role
					// That's only if the role has a category
					const personKey = this.datastore.key('Person');
					const personEntity: Person = {
						name: role.personName,
						nameEditable: true,
						lastUpdated: time,
						created: time,
					}
					entities.push({
						key: personKey,
						data: personEntity
					})
					const roleKey = this.datastore.key(['Person', personKey.id,'Film', filmKey.id,'PersonRole'])
					role.created = time;
					role.lastUpdated = time;
					entities.push({
						key: roleKey,
						data: role
					})

					// Creates history for both actions
					history.push(this.datastore.formulateHistory(
						personEntity,
						'Person',
						personKey.id,
						user,
						'create'
					))
					history.push(this.datastore.formulateHistory(
						role,
						'PersonRole',
						roleKey.id,
						user,
						'update'
					))
				} else {
					throw new BadRequestException("Something is not right in this edit, make sure you've filled all required fields")
				}
			})
		}

		// Updates watch links
		if(film.currentPlatforms){
			film.currentPlatforms.forEach(async (link) => {
				// For link of an existing platform
				// Doesn't allow to edit the name of an existing platform
				if(!link.platformName && link.platformId){
					const platformKey = this.datastore.key(['Platform', link.platformId]);
					const platform = await this.datastore.get(platformKey);
					if(platform.length >= 1 && isNaN(platform[0])){
						if(link.id){
							// Edits an existing link of an exsiting platform
							const linkKey = this.datastore.key(['Platform', platformKey.id,'Film', filmKey.id,'Link', link.id])
							delete link.id;
							delete link.platformId;
							link.lastUpdated = time;
							entities.push({
								key: linkKey,
								data: link
							})

							// Creates history
							history.push(this.datastore.formulateHistory(
								link,
								'Link',
								linkKey.id,
								user,
								'update'
							))
						} else if(!link.id){
							// Adds a new link of an exisiting platform
							const linkKey = this.datastore.key(['Platform', platformKey.id,'Film', filmKey.id, 'Link']);
							delete link.platformId;
							link.created = time;
							link.lastUpdated = time;
							entities.push({
								key: linkKey,
								data: link
							})

							// Creates history
							history.push(this.datastore.formulateHistory(
								link,
								'Link',
								linkKey.id,
								user,
								'update'
							))
						}
					} 
				} else if(link.platformName && !link.platformId && !link.id && link.url){
					// Creates a new platform and a new link
					// That's only if the link has a url
					const platformKey = this.datastore.key('Platform');
					const platformEntity: Platform = {
						name: link.platformName,
						nameEditable: true,
						lastUpdated: time,
						created: time
					}
					entities.push({
						key: platformKey,
						data: platformEntity
					})
					const linkKey = this.datastore.key(['Platform', platformKey.id,'Film', filmKey.id,'Link'])
					link.created = time;
					link.lastUpdated = time;
					entities.push({
						key: linkKey,
						data: link
					})

					// Creates history for both actions
					entities.push(this.datastore.formulateHistory(
						platformEntity,
						'Platform',
						platformKey.id,
						user,
						'create'
					))
					history.push(this.datastore.formulateHistory(
						link,
						'Link',
						linkKey.id,
						user,
						'update'
					))
				} else {
					throw new BadRequestException("Something is not right in this edit, make sure you've filled all required fields")
				}
			})
		}

		try{
			await this.datastore.transaction({id: transactionId}).upsert(entities)
			await this.datastore.transaction({id: transactionHistoryId}).insert(history)
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async softDeleteFilm(id: number, user: string){
		const filmKey = this.datastore.key(['Film', id]);
		const entity = {
			key: filmKey,
			data: {
				status: "hidden"
			}
		}

		// Write action into history
		const historyEntity = this.datastore.formulateHistory(
			{status: 'hidden'},
			filmKey.id,
			'Film',
			user,
			'softDelete'
		)

		try {
			await this.datastore.update(entity)
			await this.datastore.insert(historyEntity)
			return {'status': 'deleted'}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}
}