import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Datastore, Query } from '@google-cloud/datastore';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { HistoryOpt } from './database.types';
import { 
	Film, 
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
import { 
	CreateUserDto,  
	UpdateUserDto,
	CreateVotesDto,
	UpdateVotesDto,
	CreateRequestDto,
	UpdateRequestDto,
	CreateJournalistInfoDto,
	UpdateJournalistInfoDto
} from '../users/users.dto';
import { UserOpt, VoteOpt, RequestOpt } from '../users/users.types';
import {
	CreateContentDto,
	UpdateContentDto
} from '../content/content.dto';
import { ContentOpt } from '../content/content.types';

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

	removeKey(obj){
		delete obj[this.KEY]
		return obj
	}

	formatTitle(title: string){
		const finalSentence = title.split(" ")
		return finalSentence.map((word, index) => {
			const specialWords = ["a", "A", "an", "An", "the", "The", "of", "Of"]
			// If these words are in the middle of a sentence
			if(index !== 0 && specialWords.indexOf(word) < 0){
				return word.toLowerCase()
			} else {
				
				if(word.length == 1){
					return word.toUpperCase()
				}

				return word[0].toUpperCase() + word.substring(1)
			}
		}).join(" ")
	}

	// History methods
	formulateHistory(opt: HistoryOpt){
		const key = this.key('History');
		return {
			key: key,
			data: {
				...opt.dataObject,
				entityIdentifier: opt.id,
				entityKind: opt.kind,
				resultingAction: opt.action,
				triggeredByUser: opt.user,
				timestamp: opt.time,
			}
		}
	}

	// Content methods
	createContentEntity(data: CreateContentDto, opt: ContentOpt){
		const contentKey = this.key('Content');
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: contentKey,
			data: data
		}
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Content',
			id: contentKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updateContentEntity(data: UpdateContentDto, opt: ContentOpt){
		const contentKey = this.key(['Content', +opt.contentId]);
		data.lastUpdated = opt.time;
		try{
			const [entity] = await this.get(contentKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}
			
			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Content',
				id: contentKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history}
		} catch (err){
			throw new BadRequestException(err.message);
		}
	}

	// User methods
	createUserEntity(data: CreateUserDto, opt: UserOpt){
		const userKey = this.key(['User', opt.user]);
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.uid = opt.user;
		const entity = {
			key: userKey,
			data: data
		}
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'User',
			id: userKey.name,
			action: 'create',
			time: opt.time,
		}

		console.log('entity on createUserEntity', entity)
		return {entity, history: this.formulateHistory(historyObj)}
	}

	async updateUserEntity(data: UpdateUserDto, opt: UserOpt){
		const userKey = this.key(['User', opt.user]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(userKey);
			if(!entity) {
				throw new BadRequestException("Action not allowed")
			}			

			// Modify existing data
			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'User',
				id: userKey.name,
				action: 'update',
				time: opt.time
			}
			console.log('entity on updateUserEntity', entity)
			return {entity, history: this.formulateHistory(historyObj)}
		} catch(err: any) {
			throw new BadRequestException()
		}
	}

	createVotesEntity(data: CreateVotesDto, opt: VoteOpt){
		const voteKey = this.key('Vote');
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: voteKey,
			data: data
		}
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Vote',
			id: voteKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updateVotesEntity(data: UpdateVotesDto, opt: VoteOpt){
		const voteKey = this.key(['Vote', +opt.votesId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(voteKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Vote',
				id: voteKey.id,
				action: 'update',
				time: opt.time
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	createRequestEntity(data: CreateRequestDto, opt:RequestOpt){
		const requestKey = this.key('Request');
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: requestKey,
			data: data
		}
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Request',
			id: requestKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updateRequestEntity(data: UpdateRequestDto, opt:RequestOpt){
		const requestKey = this.key(['Request', +opt.requestId]);
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(requestKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Request',
				id: requestKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	createJournalistInfoEntity(data: CreateJournalistInfoDto, opt: UserOpt){
		const infoKey = this.key(['User', opt.user, 'JournalistInfo']);
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: infoKey,
			data: data
		}
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'JournalistInfo',
			id: infoKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updateJournalistInfoEntity(data: UpdateJournalistInfoDto, opt: UserOpt){
		const infoKey = this.key(['User', opt.user, 'JournalistInfo']);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(infoKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'JournalistInfo',
				id: infoKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message)
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
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Still',
			id: stillKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updateStillEntity(data: UpdateStillDto, opt: ImageOpt){
		const stillKey = this.key([opt.parentKind, +opt.parentId, 'Still', +opt.imageId]);
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(stillKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Still',
				id: stillKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
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
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Poster',
			id: posterKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history};
	}

	async updatePosterEntity(data: UpdatePosterDto, opt: ImageOpt){
		const posterKey = this.key([opt.parentKind, +opt.parentId, 'Poster', +opt.imageId]);
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(posterKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Poster',
				id: posterKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history};
		} catch (err: any){
			throw new BadRequestException(err.message);
		}
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
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Person',
			id: personKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return { entity, history }
	}

	async updatePersonEntity(data: UpdatePersonDto, opt: PersonOpt){
		data.lastUpdated = opt.time;
		const personKey = this.key(['Person', +opt.personId]);

		try {
			const [entity] = await this.get(personKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Person',
				id: personKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// PersonRole methods
	createPersonRoleEntity(data: CreatePersonRoleDto, opt: PersonRoleOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;
		data.personId = opt.personId;		
		// Creates the role
		const roleKey = this.key(['Person', +opt.personId, opt.parentKind, +opt.parentId, 'PersonRole']);
		const entity = {
			key: roleKey,
			data: data
		}
		// Create history
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'PersonRole',
			id: roleKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updatePersonRoleEntity(data: UpdatePersonRoleDto, opt: PersonRoleOpt){
		
		const personKey = this.datastore.key(['Person', +opt.personId]);
			
		const roleKey = this.key(['Person', +personKey.id, opt.parentKind, +opt.parentId,'PersonRole', +opt.roleId]);				
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(roleKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'PersonRole',
				id: roleKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);

			return { entity, history }
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
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
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Company',
			id: companyKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updateCompanyEntity(data: UpdateCompanyDto, opt: CompanyOpt){
		data.lastUpdated = opt.time;
		const companyKey = this.key(['Company', +opt.companyId]);

		try {
			const [entity] = await this.get(companyKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Company',
				id: companyKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	// CompanyRole methods
	createCompanyRoleEntity(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;
		data.companyId = opt.companyId	
		// Create the role
		const companyKey = this.key(['Company', +opt.companyId]);
		const roleKey = this.key(['Company', +companyKey.id, opt.parentKind, +opt.parentId, 'CompanyRole']);
		const entity = {
			key: roleKey,
			data: data
		}
		// Create history
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'CompanyRole',
			id: roleKey.id,
			action: 'update',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return {entity, history}
	}

	async updateCompanyRoleEntity(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		const companyKey = this.datastore.key(['Company', +opt.companyId]);
		
		const roleKey = this.datastore.key(['Company', +companyKey.id, opt.parentKind, +opt.parentId,'CompanyRole', +opt.roleId]);
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(roleKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			// Creates history
			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'CompanyRole',
				id: roleKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);

			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
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
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Platform',
			id: platformKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return { entity, history }
	}

	async updatePlatformEntity(data: UpdatePlatformDto, opt: PlatformOpt){
		data.lastUpdated = opt.time;
		const platformKey = this.key(['Platform', +opt.platformId]);

		try {
			const [entity] = await this.get(platformKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Platform',
				id: platformKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// Link methods
	createLinkEntity(data: CreateLinkDto, opt: LinkOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;
		data.platformId = opt.platformId
		// Creates a link
		const platformKey = this.key(['Platform', +opt.platformId])
		const linkKey = this.key(['Platform', +platformKey.id, opt.parentKind, +opt.parentId, 'Link']);
		const entity = {
			key: linkKey,
			data: data
		}
		// Creates history
		const historyObj: HistoryOpt = {
			dataObject: data,
			user: opt.user,
			kind: 'Link',
			id: linkKey.id,
			action: 'create',
			time: opt.time,
		}
		const history = this.formulateHistory(historyObj);
		return { entity, history }
	}

	async updateLinkEntity(data: UpdateLinkDto, opt: LinkOpt){
		const platformKey = this.key(['Platform', +opt.platformId]);
			
		const linkKey = this.key(['Platform', +platformKey.id, opt.parentKind, +opt.parentId,'Link', +opt.linkId]);
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(linkKey)

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			// Creates history
			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Link',
				id: platformKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = this.formulateHistory(historyObj);
			return { entity, history }
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}
}