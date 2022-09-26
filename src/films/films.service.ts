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
			const platformLinks =  await this.datastore.runQueryFull(linksQuery);
			const poster = await this.datastore.runQuery(postersQuery);
			const stills = await this.datastore.runQuery(stillsQuery);
			const distributors = await this.datastore.runQueryFull(distributorsQuery);
			const producers = await this.datastore.runQueryFull(producersQuery);
			const actors = await this.datastore.runQueryFull(actorsQuery);
			const crew = await this.datastore.runQueryFull(crewQuery);

			// Extact the entity id/name from query to expose to the client
			details[0].map(obj => {
				obj.id = obj[this.datastore.KEY]["id"]
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
				const data = this.datastore.updatePosterEntity(poster, filmKey.id, time, 'Film');
				entities.push(data);

				// Create history
				history.push(this.datastore.formulateHistory(poster, 'Poster', data.key.name, user, 'update'));
			})
		}

		// Updates stills
		if(film.stillFrames && film.stillFrames.length <= 3){
			film.stillFrames.forEach((still) => {
				const data = this.datastore.updateStillEntity(still, filmKey.id, time, 'Film');
				entities.push(data);

				// Create history
				history.push(this.datastore.formulateHistory(still, 'Still', data.key.name, user, 'update'));
			})
		}

		// Updates company roles
		if(film.companies){
			film.companies.forEach(async (role) => {
				// For company role of an existing company
				const data = await this.datastore.updateCompanyRoleEntity(role, filmKey.id, time, user, 'Film');
				entities.push(...data.entities);
				history.push(...data.history);
			})
		}

		// Updates person roles
		if(film.credits){
			film.credits.forEach(async (role) => {
				const data = await this.datastore.updatePersonRoleEntity(role, filmKey.id, time, user, 'Film');
				entities.push(...data.entities);
				history.push(...data.history);
			})
		}

		// Updates watch links
		if(film.currentPlatforms){
			film.currentPlatforms.forEach(async (link) => {
				const data = await this.datastore.updateLinkEntity(link, filmKey.id, time, user, 'Film');
				entities.push(...data.entities);
				history.push(...data.history);
			})
		}

		try{
			await this.datastore.transaction({id: transactionId}).update(entities)
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