import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Datastore, Query } from '@google-cloud/datastore';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { 
	FilmDetails, 
	Poster, 
	Still,
	ImageOpt
} from '../films/films.types';
import {
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
import {
	CreatePersonDto,
	UpdatePersonDto,
	CreatePersonRoleDto,
	UpdatePersonRoleDto
} from '../people/people.dto';
import {
	Person,
	PersonRole,
	PersonOpt,
	PersonRoleOpt
} from '../people/people.types';
import {
	CreateLinkDto,
	UpdateLinkDto,
	CreatePlatformDto,
	UpdatePlatformDto
} from '../platforms/platforms.dto';
import {
	Link,
	Platform,
	LinkOpt,
	PlatformOpt
} from '../platforms/platforms.types';

@Injectable()
export class DatabaseService extends Datastore{
	constructor(private configService: ConfigService){
		super({
			projectId: configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../config/db.json')
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
	formulateHistory(data: any, kind: string, id: string, user: string, action: string){
		const key = this.key('History');
		const history = data;
		history.entityIdentifier = id;
		history.entityKind = kind
		history.resultingAction = action;
		history.triggeredByUser = user;
		history.timestamp = new Date();
		return {
			key: key,
			data: history
		}
	}

	// Still methods
	createStillEntity(data: CreateStillDto, opt: ImageOpt){
		const stillKey = this.key([opt.parentKind, +opt.parentId, 'Still']);
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: stillKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Still', stillKey.id, opt.user, 'create');
		return {entity, history}
	}

	updateStillEntity(data: UpdateStillDto, opt: ImageOpt){
		const stillKey = this.key([opt.parentKind, +opt.parentId, 'Still', +opt.imageId]);
		data.lastUpdated = opt.time;
		const entity = {
			key: stillKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Still', stillKey.id, opt.user, 'update');
		return {entity, history};
	}

	// Poster methods
	createPosterEntity(data: CreatePosterDto, opt: ImageOpt){
		const posterKey = this.key([opt.parentKind, +opt.parentId, 'Poster']);
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: posterKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Still', posterKey.id, opt.user, 'create');
		return {entity, history};
	}

	updatePosterEntity(data: UpdatePosterDto, opt: ImageOpt){
		const posterKey = this.key([opt.parentKind, +opt.parentId, 'Poster', +opt.imageId]);
		data.lastUpdated = opt.time;
		const entity = {
			key: posterKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Still', posterKey.id, opt.user, 'update');
		return {entity, history};
	}

	// Person methods
	createPersonEntity(data: CreatePersonDto, opt: PersonOpt){
		const personKey = this.key('Person');
		data.created = opt.time;
		data.lastUpdated = opt.time;
		const entity = {
			key: personKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Person', personKey.id, opt.user, 'create');
		return { entity, history }
	}

	updatePersonEntity(data: UpdatePersonDto, opt: PersonOpt){
		data.lastUpdated = opt.time;
		const personKey = this.key(['Person', +opt.personId]);

		const entity ={key: personKey, data};
		const history = this.formulateHistory(data, 'Person', personKey.id, opt.user, 'update');
		return {entity, history}
	}

	// PersonRole methods
	createPersonRoleEntity(data: CreatePersonRoleDto, opt: PersonRoleOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;		
		// Creates the role
		const roleKey = this.key(['Person', +opt.personId, opt.parentKind, +opt.parentId, 'PersonRole']);
		const entity = {
			key: roleKey,
			data: data
		}
		// Create history
		const history = this.formulateHistory(data, 'PersonRole', roleKey.id, opt.user, 'create');
		return {entity, history}
	}

	updatePersonRoleEntity(data: UpdatePersonRoleDto, opt: PersonRoleOpt){
		
		const personKey = this.datastore.key(['Person', +opt.personId]);
			
		const roleKey = this.key(['Person', +personKey.id, opt.parentKind, +opt.parentId,'PersonRole', +opt.roleId]);				
		data.lastUpdated = opt.time;
		const entity = {
			key: roleKey,
			data: data
		}
		const history = this.formulateHistory(data, 'PersonRole', roleKey.id, opt.user, 'update');

		return { entity, history }
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
		const companyKey = this.key(['Company', +opt.companyId]);

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
		const companyKey = this.key(['Company', +opt.companyId]);
		const roleKey = this.key(['Company', +companyKey.id, opt.parentKind, +opt.parentId, 'CompanyRole']);
		const entity = {
			key: roleKey,
			data: data
		}
		// Create history
		const history = this.formulateHistory(data, 'CompanyRole', roleKey.id, opt.user, 'create');
		return {entity, history}
	}

	updateCompanyRoleEntity(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		const companyKey = this.datastore.key(['Company', +opt.companyId]);
		
		const roleKey = this.datastore.key(['Company', +companyKey.id, opt.parentKind, +opt.parentId,'CompanyRole', +opt.roleId]);
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
	createPlatformEntity(data: CreatePlatformDto, opt: PlatformOpt){
		const platformKey = this.key('Platform');
		data.created = opt.time;
		data.lastUpdated = opt.time;
		const entity = {
			key: platformKey,
			data: data
		}
		const history = this.formulateHistory(data, 'Platform', platformKey.id, opt.user, 'create');
		return { entity, history }
	}

	updatePlatformEntity(data: UpdatePlatformDto, opt: PlatformOpt){
		data.lastUpdated = opt.time;
		const platformKey = this.key(['Platform', +opt.platformId]);
		const entity = {key: platformKey, data};
		const history = this.formulateHistory(data, 'Platform', platformKey.id, opt.user, 'update');
		return {entity, history}
	}

	// Link methods
	createLinkEntity(data: CreateLinkDto, opt: LinkOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;
		// Creates a link
		const platformKey = this.key(['Platform', +opt.platformId])
		const linkKey = this.key(['Platform', +platformKey.id, opt.parentKind, +opt.parentId, 'Link']);
		const entity = {
			key: linkKey,
			data: data
		}
		// Create history
		const history = this.formulateHistory(data, 'Link', linkKey.id, user, 'create');
		return { entity, history }
	}

	updateLinkEntity(data: UpdateLinkDto, opt: LinkOpt){
		const platformKey = this.key(['Platform', data.platformId]);
			
		const linkKey = this.key(['Platform', +platformKey.id, opt.parentKind, +opt.parentId,'Link', +opt.linkId]);
		data.lastUpdated = opt.time;
		const entity = {
			key: linkKey,
			data: data
		}
		// Creates history
		const history = this.formulateHistory(data, 'Link', linkKey.id, opt.user, 'update');
		return { entity, history }
	}
}