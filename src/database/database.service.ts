import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Datastore } from '@google-cloud/datastore';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
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
} from '../films/films.types'

@Injectable()
export class DatabaseService extends Datastore{
	constructor(private configService: ConfigService){
		super({
			projectId: configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../db.json')
		})
	}

	// Entities formulators
	formulateHistory(data: any, kind: string, id: number|string, user: string, action: string){
		const key = this.key('History');
		const history = data;
		const time = new Date();
		history.entityIdentifier = id;
		history.resultingAction = action;
		history.triggeredByUser = user;
		history.timestamp = new Date();
		return {
			key: key,
			data: history
		}
	}

	// Still methods
	createStillEntity(data: any, id: number|string, time: Date, kind: string){
		const stillKey = this.key([kind, id, 'Still', data.url]);
		data.lastUpdated = time;
		data.created = time;
		return {
			key: stillKey,
			data: data
		}
	}

	// Poster methods
	createPosterEntity(data: any, id: number|string, time: Date, kind){
		const stillKey = this.key([kind, id, 'Poster', data.url]);
		data.lastUpdated = time;
		data.created = time;
		return {
			key: stillKey,
			data: data
		}
	}

	// Person methods

	// PersonRole methods
	async createPersonRoleEntity(data: any, id: number|string, time: Date, user: string, kind: string){
		data.lastUpdated = time;
		data.created = time;
		const entities = []
		const history = []
		if(data.category){
			if(data.personId){
				// Checks whether the person id real or bogus
				const personKey = this.key(['Person', data.personId])
				const person = await this.get(personKey)
				if(person.length >= 1 && isNaN(person[0])){
					// Creates the role for this existing person
					const roleKey = this.key(['Person', personKey.id, kind, id, 'PersonRole']);
					delete data.personId;
					entities.push({
						key: roleKey,
						data: data
					})
					// Creates history
					history.push(this.formulateHistory(data, 'PersonRole', roleKey.id, user, 'create'));
				}
			} else {
				// Creates the role and a new person
				const personKey = this.key('Person')
				const personEntity: Person = {
					name: data.personName,
					nameEditable: true,
					lastUpdated: time,
					created: time,
				}
				entities.push({
					key: personKey,
					data: personEntity
				})
				const roleKey = this.key(['Person', personKey.id, kind, id, 'PersonRole']);
				entities.push({
					key: roleKey,
					data: data
				})
				// Create history for both actions
				history.push(this.formulateHistory(personEntity, 'Person', personKey.id, user, 'create'));
				history.push(this.formulateHistory(data, 'PersonRole', roleKey.id, user, 'create'));
			}
		}else {
			throw new BadRequestException("Role category cannot be empty");
		}
		// Return enitity the arrays
		return {entities, history}
	}

	// Company methods

	// CompanyRole methods
	async createCompanyRoleEntity(data: any, id: number|string, time: Date, user: string, kind: string){
		data.lastUpdated = time;
		data.created = time;
		const entities = [];
		const history = [];
		if(data.type){
			// Checks whether the company in question already exist
			if(data.companyId){
				// Checks whether the company id real or bogus
				const companyKey = this.key(['Company', data.companyId]);
				const company = await this.get(companyKey);
				if(company.length >= 1 && isNaN(company[0])){
					const roleKey = this.key(['Company', companyKey.id, kind, id, 'CompanyRole']);
					delete data.companyId;
					entities.push({
						key: roleKey,
						data: data
					})
					// Create history
					history.push(this.formulateHistory(data, 'CompanyRole', roleKey.id, user, 'create'));
				}
			} else {
				// Create the role and a new company
				const companyKey = this.key('Company');
				const companyEntity: Company = {
					name: data.companyName,
					nameEditable: true,
					website: data.website,
					lastUpdated: time,
					created: time,
				}
				entities.push({
					key: companyKey,
					data: companyEntity
				})
				const roleKey = this.key(['Company', companyKey.id, kind, id, 'CompanyRole']);
				entities.push({
					key: roleKey,
					data: data
				})

				// Create histories for actions
				history.push(this.formulateHistory(companyEntity, 'Company', companyKey.id, user, 'create'));
				history.push(this.formulateHistory(data, 'CompanyRole', roleKey.id, user, 'create'));
			}
		} else {
			throw new BadRequestException("Role type cannot be empty");
		}

		return { entities, history}
	}

	// Platform methods

	// Link methods
	async createLinkEntity(data: any, id: number|string, time: Date, user: string, kind: string){
		data.lastUpdated = time;
		data.created = time;
		const entities = [];
		const history = [];
		// What's a link w/o a url? The following code skips it
		if(data.url){
			// Checks whether the platform in question already exist
			if(data.platformId){
				// Checks whether the platform id real or bogus
				const platformKey = this.key(['Platform', data.platformId]);
				const platform = await this.get(platformKey);
				if(platform.length >= 1 && isNaN(platform[0])){
					const linkKey = this.key(['Platform', platformKey.id, kind, id, 'Link']);
					delete data.platformId;
					entities.push({
						key: linkKey,
						data: data
					})

					// Create history
					history.push(this.formulateHistory(data, 'Link', linkKey.id, user, 'create'));
				}
			} else {
				// Creates a link and a new platform
				const platformKey = this.key('Platform');
				const platform: Platform = {
					name: data.platformName,
					nameEditable: true,
					lastUpdated: time,
					created: time
				}
				entities.push({
					key: platformKey,
					data: platform
				})
				const linkKey = this.key(['Platform', platformKey.id, kind, id, 'Link']);
				entities.push({
					key: linkKey,
					data: data
				})
				// Create histories for both actions
				history.push(this.formulateHistory(platform, 'Platform', platformKey.id, user, 'create'));
				history.push(this.formulateHistory(data, 'Link', linkKey.id, user, 'create'));
			}
		} else {
			throw new BadRequestException("Link URL cannot be empty");
		}

		return { entities, history }
	}
}