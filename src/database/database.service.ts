import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Datastore, Query } from '@google-cloud/datastore';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { 
	FilmDetails, 
	Poster, 
	Still, 
	PersonRole, 
	Person,
	Link,
	Platform
} from '../films/films.types';
import {
	CreateLinkDto,
	UpdateLinkDto,
	CreatePersonRoleDto,
	UpdatePersonRoleDto,
	CreateStillDto,
	UpdateStillDto,
	CreatePosterDto,
	UpdatePosterDto,
} from '../films/films.dto';
import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto,
	CreateCompanyDto,
	UpdateCompanyDto
} from '../companies/companies.dto';
import { 
	Company,	
	CompanyRole, 
	CompanyRoleOpt,
	CompanyOpt
} from '../companies/companies.types';

@Injectable()
export class DatabaseService extends Datastore{
	constructor(private configService: ConfigService){
		super({
			projectId: configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../db.json')
		})
	}

	// Runs the runQuery method but explicity exposes entity id in return
	async runQueryFull(query: Query){
		const [objects, info] = await this.runQuery(query)
		return objects.map(obj => {
			obj.id = obj[this.datastore.KEY]["id"]
			return obj
		})
	}

	// History methods
	formulateHistory(data: any, kind: string, id: number|string, user: string, action: string){
		const key = this.key('History');
		const history = data;
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
	createStillEntity(data: CreateStillDto, parentId: number|string, time: Date, parentKind: string){
		const stillKey = this.key([parentKind, parentId, 'Still', data.url]);
		data.lastUpdated = time;
		data.created = time;
		return {
			key: stillKey,
			data: data
		}
	}

	updateStillEntity(data: UpdateStillDto, parentId: number|string, time: Date, parentKind: string){
		const stillKey = this.key([parentKind, parentId, 'Still', data.url]);
		data.lastUpdated = time;
		return {
			key: stillKey,
			data: data
		}
	}

	// Poster methods
	createPosterEntity(data: CreatePosterDto, parentId: number|string, time: Date, parentKind: string){
		const stillKey = this.key([parentKind, parentId, 'Poster', data.url]);
		data.lastUpdated = time;
		data.created = time;
		return {
			key: stillKey,
			data: data
		}
	}

	updatePosterEntity(data: UpdatePosterDto, parentId: string, time: Date, parentKind: string){
		const stillKey = this.key([parentKind, parentId, 'Poster', data.url]);
		data.lastUpdated = time;
		return {
			key: stillKey,
			data: data
		}
	}

	// Person methods
	createPersonEntity(data: any, time: Date, user: string){
		const personKey = this.key('Person');
		data.nameEditable = true;
		data.created = time;
		data.lastUpdated = time;
		const entity = {
			key: personKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Person', personKey.id, user, 'create');
		return { entity, history }
	}

	updatePersonEntity(data: any, time: Date, user: string){
		const history = [];
		const entity = [];
		if(data.id){
			data.lastUpdated = time;
			const personKey = this.key(['Person', data.id]);
			delete data.id;
			entity.push({key: personKey, data});
			history.push(this.formulateHistory(data, 'Person', personKey.id, user, 'update'));
		}
	}

	// PersonRole methods
	async createPersonRoleEntity(data: CreatePersonRoleDto, parentId: string, time: Date, user: string, parentKind: string){
		data.lastUpdated = time;
		data.created = time;
		data.ownerKind = parentKind;
		data.ownerId = parentId;
		const entities = []
		const history = []
		if(data.category){
			if(data.personId){
				// Checks whether the person id real or bogus
				const personKey = this.key(['Person', data.personId])
				const [person] = await this.get(personKey)
				if(isNaN(person)){
					// Creates the role for this existing person
					const roleKey = this.key(['Person', personKey.id, parentKind, parentId, 'PersonRole']);
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
				const personEntity = {
					name: data.personName,
					nameEditable: true,
					lastUpdated: time,
					created: time,
				}
				entities.push({
					key: personKey,
					data: personEntity
				})
				const roleKey = this.key(['Person', personKey.id, parentKind, parentId, 'PersonRole']);
				entities.push({
					key: roleKey,
					data: data
				})
				// Create history for both actions
				history.push(this.formulateHistory(personEntity, 'Person', personKey.id, user, 'create'));
				history.push(this.formulateHistory(data, 'PersonRole', roleKey.id, user, 'create'));
			}
		}

		// Return enitity the arrays
		return {entities, history}
	}

	async updatePersonRoleEntity(data: UpdatePersonRoleDto, parentId: string, time: Date, user: string, parentKind: string){
		const entities = [];
		const history = [];
		if(data.personId && data.id){
			const personKey = this.datastore.key(['Person', data.personId]);
			const person = await this.datastore.get(personKey);
			if(person.length >= 1 && isNaN(person[0])){
				// Edits an existing person role of an exsiting person
				const roleKey = this.key(['Person', personKey.id, parentKind, parentId,'PersonRole', data.id])
				delete data.id;
				delete data.personId;
				data.lastUpdated = time;
				entities.push({
					key: roleKey,
					data: data
				})

				// Creates history
				history.push(this.formulateHistory(data, 'PersonRole', roleKey.id, user, 'update'));

				// Updates the the parent kind if there's a change
				if(data.personName){
					const updateData = {
						lastUpdated: time
					}
					data.personName && person[0].nameEditable == true ? updateData['name'] = data.personName : null;
					
					entities.push({
						key: personKey,
						data: updateData
					})

					// Creates history
					history.push(this.formulateHistory(updateData, 'Person', personKey.id, user, 'update'));
				}
			} 
		}

		return { entities, history }
	}

	// Company methods
	createCompanyEntity(data: CreateCompanyDto, opt: CompanyOpt){
		const companyKey = this.key('Company');
		data.created = opt.time;
		data.lastUpdated = opt.time;
		const entity = {
			key: companyKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Company', companyKey.id, opt.user, 'create');
		return {entity, history}
	}

	updateCompanyEntity(data: UpdateCompanyDto, opt: CompanyOpt){
		data.lastUpdated = opt.time;
		const companyKey = this.key(['Company', opt.companyId]);

		const entity = {key: companyKey, data};
		const history = this.formulateHistory(data, 'Company', companyKey.id, opt.user, 'update');
		
		return {entity, history}
	}

	// CompanyRole methods
	createCompanyRoleEntity(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;	
		// Create the role
		const companyKey = this.key(['Company', opt.companyId]);
		const roleKey = this.key(['Company', companyKey.id, opt.parentKind, opt.parentId, 'CompanyRole']);
		const entity = {
			key: roleKey,
			data: data
		}
		// Create history
		const history = this.formulateHistory(data, 'CompanyRole', roleKey.id, opt.user, 'create');
		return {entity, history}
	}

	updateCompanyRoleEntity(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		const companyKey = this.datastore.key(['Company', opt.companyId]);
		
		const roleKey = this.datastore.key(['Company', companyKey.id, opt.parentKind, opt.parentId,'CompanyRole', opt.roleId]);
		data.lastUpdated = opt.time;
		const entity = {
			key: roleKey,
			data: data
		}

		// Creates history
		const history = this.formulateHistory(data, 'CompanyRole', roleKey.id, opt.user, 'update');

		return {entity, history}
	}

	// Platform methods
	createPlatformEntity(data: any, time: Date, user: string){
		const platformKey = this.key('Platform');
		data.nameEditable = true;
		data.created = time;
		data.lastUpdated = time;
		const entity = {
			key: platformKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Platform', platformKey.id, user, 'create');
		return { entity, history }
	}

	updatePlatformEntity(data: any, time: Date, user: string){
		const history = [];
		const entity = [];
		if(data.id){
			data.lastUpdated = time;
			const platformKey = this.key(['Platform', data.id]);
			delete data.id;
			entity.push({key: platformKey, data});
			history.push(this.formulateHistory(data, 'Platform', platformKey.id, user, 'update'));
		}
	}

	// Link methods
	async createLinkEntity(data: CreateLinkDto, parentId: string, time: Date, user: string, parentKind: string){
		data.lastUpdated = time;
		data.created = time;
		data.ownerKind = parentKind;
		data.ownerId = parentId;
		const entities = [];
		const history = [];
		// What's a link w/o a url? The following code skips it
		if(data.url){
			// Checks whether the platform in question already exist
			if(data.platformId){
				// Checks whether the platform id real or bogus
				const platformKey = this.key(['Platform', data.platformId]);
				const [platform] = await this.get(platformKey);
				if(isNaN(platform)){
					const linkKey = this.key(['Platform', platformKey.id, parentKind, parentId, 'Link']);
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
				const platform = {
					name: data.platformName,
					nameEditable: true,
					lastUpdated: time,
					created: time
				}
				entities.push({
					key: platformKey,
					data: platform
				})
				const linkKey = this.key(['Platform', platformKey.id, parentKind, parentId, 'Link']);
				entities.push({
					key: linkKey,
					data: data
				})
				// Create histories for both actions
				history.push(this.formulateHistory(platform, 'Platform', platformKey.id, user, 'create'));
				history.push(this.formulateHistory(data, 'Link', linkKey.id, user, 'create'));
			}
		}

		return { entities, history }
	}

	async updateLinkEntity(data: UpdateLinkDto, parentId: string, time: Date, user: string, parentKind: string){
		const entities = [];
		const history = [];
		if(data.platformId && data.id){
			const platformKey = this.key(['Platform', data.platformId]);
			const platform = await this.get(platformKey);
			if(platform.length >= 1 && isNaN(platform[0])){
				// Edits an existing link of an exsiting platform
				const linkKey = this.key(['Platform', platformKey.id, parentKind, parentId,'Link', data.id]);
				delete data.id;
				delete data.platformId;
				data.lastUpdated = time;
				entities.push({
					key: linkKey,
					data: data
				})

				// Creates history
				history.push(this.formulateHistory(data, 'Link', linkKey.id, user, 'update'));

				// Updates the the parent kind if there's a change
				if(data.platformName){
					const updateData = {
						lastUpdated: time
					}
					data.platformName && platform[0].nameEditable == true ? updateData['name'] = data.platformName : null
					entities.push({
						key: platformKey,
						data: updateData
					})

					// Creates history
					history.push(this.formulateHistory(updateData, 'Platform', platformKey.id, user, 'update'));
				}
			}
		}

		return { entities, history }
	}
}