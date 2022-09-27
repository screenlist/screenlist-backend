import { 
	Injectable, 
	ParseFileOptions, 
	BadRequestException, 
	NotFoundException, 
	UnauthorizedException 
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { CreateSeriesDto, UpdateSeriesDto } from './series.dto';
import { 
	Poster, 
	Still, 
	PersonRole, 
	Person,
	Link,
	Platform
} from '../films/films.types';
import { SeriesType, SeriesDetails } from './series.types';
import { Company, CompanyRole } from '../companies/companies.types';

@Injectable()
export class SeriesService {
	constructor(
		private configService: ConfigService,
		private datastore: DatabaseService
	){
		this.datastore = new DatabaseService(configService)
	}

	async findAll(): Promise<SeriesType[]>{
		const query = this.datastore.createQuery('Series').filter('status', '=', 'public').limit(20)
		const results = []
		try {
			const series = await this.datastore.runQueryFull(query)
			// Loop through each series to retrieve its poster
			series[0].forEach(async (series: SeriesDetails) => {
				const seriesKey = this.datastore.key(['Series', series.id])
				const posterQuery = this.datastore.createQuery('Poster')
					.hasAncestor(seriesKey)
					.filter('quality', '=', 'SD')
					.limit(1);
				const posters: Poster[] = await this.datastore.runQueryFull(posterQuery);
				const wholeFilm: SeriesType = {
					details: series,
					posters: posters
				}
				results.push(wholeFilm);
			})
			return results
		} catch {
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findOne(id: number, user: string): Promise<SeriesType>{
		const seriesKey = this.datastore.key(['Series', id]);
		// Create queries
		const postersQuery = this.datastore.createQuery('Poster')
			.hasAncestor(seriesKey)
			.filter('quality', '=', 'HD')
			.order('created', {descending: true})
			.limit(1);
		const linksQuery =this.datastore.createQuery('Link')
			.hasAncestor(seriesKey)
			.order('created', {descending: true});
		const stillsQuery = this.datastore.createQuery('Still')
			.hasAncestor(seriesKey)
			.filter('quality','=', 'HD')
			.order('created', {descending: true})
			.limit(6);
		const producersQuery = this.datastore.createQuery('CompanyRole')
			.hasAncestor(seriesKey)
			.filter('type', '=', 'production')
			.order('companyName');
		const actorsQuery = this.datastore.createQuery('PersonRole')
			.hasAncestor(seriesKey)
			.filter('category', '=', 'talent')
			.order('personName');
		const crewQuery = this.datastore.createQuery('PersonRole')
			.hasAncestor(seriesKey)
			.filter('category', '=', 'crew')
			.order('title');

		try {
			// Run queries
			const details = await this.datastore.get(seriesKey);
			// Check whether the series is public or hidden before continuing
			if(details[0].status != "public"){
				throw new NotFoundException("Not available");
			}
			const platformLinks: Link[] =  await this.datastore.runQueryFull(linksQuery);
			const poster = await this.datastore.runQuery(postersQuery);
			const stills = await this.datastore.runQuery(stillsQuery);
			const producers: CompanyRole[] = await this.datastore.runQueryFull(producersQuery);
			const actors: PersonRole[] = await this.datastore.runQueryFull(actorsQuery);
			const crew: PersonRole[] = await this.datastore.runQueryFull(crewQuery);

			// Extact the entity id/name from query to expose to the client
			details.map(obj => {
				obj.id = obj[this.datastore.KEY]["id"]
				return obj
			})

			const film: SeriesType = {
				details: details[0] as SeriesDetails,
				posters: poster[0] as Poster[],
				stills: stills[0] as Still[],
				producers: producers,
				platforms: platformLinks,
				actors: actors,
				crew: crew
			}

			return film
		} catch(err: any){
			throw new NotFoundException("Could not retrieve film");
		}
	}

	async createOne(series: CreateSeriesDto, user: string){
		const transactionId = (new Date()).toISOString().concat("-create-series-"+series.details.name);
		// A variable to house all entities created
		let entities = []
		// Creates the series details entity
		const seriesKey = this.datastore.key('Series');
		const filmName = series.details.name;
		const time = new Date();
		series.details.slug = filmName.concat("-"+seriesKey.id.toString());
		series.details.lastUpdated = time;
		series.details.created = time;
		series.details.status = "public"
		series.details.nameEditable = true;
		entities.push({
			key: seriesKey,
			data: series.details
		})
		// Write series action into history
		entities.push(this.datastore.formulateHistory(series.details, 'Series',	seriesKey.id,	user,	'create'));

		// Creates poster entities
		series.posters.forEach(poster => {
			const posterEntity = this.datastore.createPosterEntity(poster, seriesKey.id, time, 'Series');
			entities.push(posterEntity)
			// Write poster action into history
			entities.push(this.datastore.formulateHistory(poster,	'Poster',	posterEntity.key.name,	user,	'create'));
		})
		// Creates still frame entities
		series.stillFrames.forEach(frame => {
			const still = this.datastore.createStillEntity(frame, seriesKey.id, time, 'Series');
			entities.push(still)
			// Write film action into history
			entities.push(this.datastore.formulateHistory(frame, 'Still', still.key.name, user, 'create'));
		})
		// Creates person role entities
		series.credits.forEach(async (role) => {
			const data = await this.datastore.createPersonRoleEntity(role, seriesKey.id, time, user, 'Series');
			entities.push(...data.entities);
			entities.push(...data.history);
		})
		// Creates company role entities
		series.companies.forEach(async (role) => {
			const data = await this.datastore.createCompanyRoleEntity(role, seriesKey.id, time, user, 'Series');
			entities.push(...data.entities);
			entities.push(...data.history);
		})
		// Creates link entites
		series.currentPlatforms.forEach(async (link) => {
			const data = await this.datastore.createLinkEntity(link, seriesKey.id, time, user, 'Series');
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

	async updateOne(series: UpdateSeriesDto, user: string){
		const transactionId = (new Date()).toISOString().concat('-updated-series-'+series.details.name);
		const transactionHistoryId = transactionId+"-history";
		const time = new Date()
		let history = [] // Where to put all history entities
		let entities = [] // Where to put all entities needing an update
		const seriesKey = this.datastore.key(['Series', series.details.id]);
		const state = await this.datastore.get(seriesKey) // to check if the film really exists
		if(state.length !>= 1 && isNaN(state[0]) == false){
			throw new NotFoundException('This film does not exist')
		}
		if(series.details.name && state[0].nameEditable == false){
			throw new UnauthorizedException('You are not authorised to edit the film name');
		}
		if(series.details.slug){
			throw new UnauthorizedException('You are not authorised to edit the slug');
		}
		delete series.details.id; // deletes the id from entity
		if(Object.keys(series.details).length >= 1){
			series.details.lastUpdated = time
			entities.push({
				key: seriesKey,
				data: series.details
			})

			// Create history
			history.push(this.datastore.formulateHistory(series.details, 'Series', seriesKey.id, user, 'update'));
		}

		// Updates posters
		if(series.posters && series.posters.length <= 2){
			series.posters.forEach((poster) => {
				const data = this.datastore.updatePosterEntity(poster, seriesKey.id, time, 'Series');
				entities.push(data);

				// Create history
				history.push(this.datastore.formulateHistory(poster, 'Poster', data.key.name, user, 'update'));
			})
		}

		// Updates stills
		if(series.stillFrames && series.stillFrames.length <= 3){
			series.stillFrames.forEach((still) => {
				const data = this.datastore.updateStillEntity(still, seriesKey.id, time, 'Series');
				entities.push(data);

				// Create history
				history.push(this.datastore.formulateHistory(still, 'Still', data.key.name, user, 'update'));
			})
		}

		// Updates company roles
		if(series.companies){
			series.companies.forEach(async (role) => {
				// For company role of an existing company
				const data = await this.datastore.updateCompanyRoleEntity(role, seriesKey.id, time, user, 'Series');
				entities.push(...data.entities);
				history.push(...data.history);
			})
		}

		// Updates person roles
		if(series.credits){
			series.credits.forEach(async (role) => {
				const data = await this.datastore.updatePersonRoleEntity(role, seriesKey.id, time, user, 'Series');
				entities.push(...data.entities);
				history.push(...data.history);
			})
		}

		// Updates watch links
		if(series.currentPlatforms){
			series.currentPlatforms.forEach(async (link) => {
				const data = await this.datastore.updateLinkEntity(link, seriesKey.id, time, user, 'Series');
				entities.push(...data.entities);
				history.push(...data.history);
			})
		}

		try{
			await this.datastore.transaction({id: transactionId}).update(entities);
			await this.datastore.transaction({id: transactionHistoryId}).insert(history);
			return { 'status': 'successfully updated' };
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}
}
