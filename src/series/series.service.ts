import { 
	Injectable, 
	ParseFileOptions, 
	BadRequestException, 
	NotFoundException, 
	UnauthorizedException 
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { CreateSeriesDto, UpdateSeriesDto } from './series.dto';
import { 
	Poster, 
	Still
} from '../films/films.types';
import { SeriesType, Series } from './series.types';
import { Person, PersonRole } from '../people/people.types';
import { Link, Platform } from '../platforms/platforms.types';
import { Company, CompanyRole } from '../companies/companies.types';
import { HistoryOpt } from '../database/database.types';

@Injectable()
export class SeriesService {
	constructor(
		private configService: ConfigService,
		private storage: StorageService,
		private db: DatabaseService
	){
		this.db = new DatabaseService(configService);
		this.storage = new StorageService(configService);
	}

	async findAll() {
		const query = this.db.createQuery('Series').filter('status', '=', 'public').limit(20)
		try {
			const [series] = await this.db.runQuery(query)
			// Loop through each series to retrieve its poster
			if(!series.length){
				return []
			}

			series[0].map(async (series: Series) => {
				const seriesKey = this.db.key(['Series', series.id])
				const posterQuery = this.db.createQuery('Poster')
					.hasAncestor(seriesKey)
					.filter('quality', '=', 'SD')
					.limit(1);
				const [poster] = await this.db.runQuery(posterQuery);
				if(!poster.length){
					return series
				}
				const wholeSeries = {
					...series,
					posterUrl: poster[0]['url']
				}
				return wholeSeries
			})
			return series[0]
		} catch (err: any) {
			console.log(err)
			throw new NotFoundException('Encountered trouble while trying to retrieve');
		}
	}

	async findOne(id: string): Promise<SeriesType>{
		const seriesKey = this.db.key(['Series', id]);
		// Create queries
		const postersQuery = this.db.createQuery('Poster')
			.hasAncestor(seriesKey)
			.filter('quality', '=', 'HD')
			.order('created', {descending: true})
			.limit(1);
		const linksQuery =this.db.createQuery('Link')
			.hasAncestor(seriesKey)
			.order('created', {descending: true});
		const stillsQuery = this.db.createQuery('Still')
			.hasAncestor(seriesKey)
			.filter('quality','=', 'HD')
			.order('created', {descending: true})
			.limit(6);
		const producersQuery = this.db.createQuery('CompanyRole')
			.hasAncestor(seriesKey)
			.filter('type', '=', 'production')
			.order('companyName');
		const actorsQuery = this.db.createQuery('PersonRole')
			.hasAncestor(seriesKey)
			.filter('category', '=', 'talent')
			.order('personName');
		const crewQuery = this.db.createQuery('PersonRole')
			.hasAncestor(seriesKey)
			.filter('category', '=', 'crew')
			.order('title');

		try {
			// Run queries
			const [details] = await this.db.get(seriesKey);

			const platformLinks: Link[] =  await this.db.runQueryFull(linksQuery);
			const [poster] = await this.db.runQuery(postersQuery);
			const [stills] = await this.db.runQuery(stillsQuery);
			const producers: CompanyRole[] = await this.db.runQueryFull(producersQuery);
			const actors: PersonRole[] = await this.db.runQueryFull(actorsQuery);
			const crew: PersonRole[] = await this.db.runQueryFull(crewQuery);

			// Extact the entity id/name from query to expose to the client
			details.id = details[this.db.KEY]["id"]
			details.poster = poster[0]

			const film: SeriesType = {
				details: details[0] as Series,
				stills: stills as Still[],
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
		// Creates the series details entity
		const seriesKey = this.db.key('Series');
		const filmName = series.name;
		const time = new Date();
		series.slug = filmName.concat("-"+seriesKey.id.toString());
		series.lastUpdated = time;
		series.created = time;
		const entity = {
			key: seriesKey,
			data: series
		}
		try {
			await this.db.insert(entity);
			// Write series action into history
			const historyObj: HistoryOpt = {
				dataObject: series,
				user: user,
				time: time,
				action: 'create',
				kind: 'Series',
				id: seriesKey.id
			}
			await this.db.createHistory(historyObj)
			return entity.data;
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(series: UpdateSeriesDto, user: string, id: string){
		const time = new Date();
		const seriesKey = this.db.key(['Series', +id]);

		if(series.name || series.slug){
			series.slug = series.name.concat("-"+seriesKey.id);
		}		
		
		series.lastUpdated = time
		const entity = {
			key: seriesKey,
			data: series
		}
		try{
		 	await this.db.update(entity);
			// Create history
			const historyObj: HistoryOpt = {
				dataObject: series,
				user: user,
				time: time,
				action: 'update',
				kind: 'Series',
				id: seriesKey.id
			}
			const history = await this.db.createHistory(historyObj);
			return entity.data;
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(id: string, user: string){
		const deletion = []
		const history = []
		const time = new Date();
		const seriesKey = this.db.key(['Series', +id]);
		const postersQuery = this.db.createQuery('Poster').hasAncestor(seriesKey);
		const linksQuery =this.db.createQuery('Link').hasAncestor(seriesKey);
		const stillsQuery = this.db.createQuery('Still').hasAncestor(seriesKey);
		const companiesRolesQuery = this.db.createQuery('CompanyRole').hasAncestor(seriesKey);
		const peopleRolesQuery = this.db.createQuery('PersonRole').hasAncestor(seriesKey);
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

			links.forEach( async (link: Link) => {
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
			companiesRoles.forEach( async (role: CompanyRole) => {
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
			peopleRoles.forEach( async (role: PersonRole) => {
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
			const [series] = await this.db.get(seriesKey);
			deletion.push(series);
			// Write action into history
			const historyObj: HistoryOpt = {
				dataObject: series,
				user: user,
				kind: 'Series',
				id: seriesKey.id,
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
}
