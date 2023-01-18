import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Datastore, Query } from '@google-cloud/datastore';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import algoliasearch from 'algoliasearch';
import { HistoryOpt } from './database.types';
import { 
	Film, 
	Poster, 
	Still,
	ImageOpt,
	RatingOpt
} from '../films/films.types';
import {
	CreateStillDto,
	UpdateStillDto,
	CreatePosterDto,
	UpdatePosterDto,
	CreateListRatingDto,
	UpdateListRatingDto,
	CreateDisplayPhotoDto,
	UpdateDisplayPhotoDto,
	CreateContentPhotoDto,
	UpdateContentPhotoDto
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

	// Initialise AlgoliaSearch
	public algolia = algoliasearch(this.configService.get('ALGOLIA_ID'), this.configService.get('ALGOLIA_API'))

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
		const workingSentence = title.split(" ")
		const final = workingSentence.map((word, index) => {
			const specialWords = ["a", "A", "an", "An", "the", "The", "of", "Of"]
			// If these words are in the middle of a sentence
			if(index !== 0 && specialWords.indexOf(word) != -1){
				console.log("gate 1", "index no "+index, word)
				return word.toLowerCase()
			} else {
				console.log("gate 2", "index no "+index, word)
				if(word.length == 1){
					return word.toUpperCase()
				}

				return word[0].toUpperCase() + word.substring(1)
			}
		})
		console.log(title)
		console.log(workingSentence)
		console.log(final)
		return final.join(" ")
	}

	// History methods
	async createHistory(opt: HistoryOpt){
		const key = this.key('History');
		const write =  {
			key: key,
			data: {
				...opt.dataObject,
				xIdentifier: opt.id,
				xKind: opt.kind,
				xAction: opt.action,
				xUser: opt.user,
				xTimestamp: opt.time,
			}
		}

		try {
			await this.insert(write)
			return write
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	// Content methods
	async createContentEntity(data: CreateContentDto, opt: ContentOpt){
		const contentKey = this.key('Content');
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.slug = data.type == 'blog' ? data.headline.toLowerCase().concat(`-${new Date(opt.time).toISOString()}`).replace(/[^0-9a-z]/gi, '-') : data.type;
		const entity = {
			key: contentKey,
			data: data
		}
		try {
			if(data.type == 'blog'){
				const blogQuery = this.createQuery('Content').filter('type', '=', 'blog').filter('slug', '=', data.slug);
				const [results] = await this.runQuery(blogQuery);
				if(results.length > 0){
					throw new BadRequestException('Slug already exists')
				}
			}

			await this.insert(entity)
			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Content',
				id: contentKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				objectID: entity.key.id,
				author: data.author,
				headline: data.headline,
				tags: data.tags,
				created: data.created,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('content').saveObject(searchRecord).wait();

			return {entity, history}
		} catch(err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateContentEntity(data: UpdateContentDto, opt: ContentOpt, entity: any){
		const contentKey = this.key(['Content', +opt.contentId]);
		data.lastUpdated = opt.time;

		try{
			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			if(data.headline) {
				data.slug = entity.type == 'blog' ? data.headline.toLowerCase().concat(`-${new Date(opt.time).toISOString()}`).replace(/[^0-9a-z]/gi, '-') : entity.type;
			}

			if(entity.type == 'blog'){
				const blogQuery = this.createQuery('Content').filter('type', '=', 'blog').filter('slug', '=', data.slug);
				const [results] = await this.runQuery(blogQuery);
				if(results.length > 0){
					throw new BadRequestException('Slug already exists')
				}
			}

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			await this.update(entity);
			
			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Content',
				id: contentKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				objectID: entity.key.id,
				author: data.author,
				headline: data.headline,
				tags: data.tags,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('content').partialUpdateObject(searchRecord).wait();

			return {entity, history}
		} catch (err){
			throw new BadRequestException(err.message);
		}
	}

	// ContentPhoto methods
	async createContentPhotoEntity(data: CreateContentPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'ContentPhoto', opt.imageId]);
		data.photoIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: photoKey,
			data: data
		}

		const query = this.createQuery('ContentPhoto').hasAncestor(this.key([opt.parentKind, +opt.parentId]));
		try {
			const [existing] = await this.runQuery(query);

			if(existing.length > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}
			
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'ContentPhoto',
				id: photoKey.name,
				action: 'create',
				time: opt.time,
			}

			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateContentPhotoEntity(data: UpdateContentPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'ContentPhoto', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(photoKey);

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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'ContentPhoto',
				id: photoKey.name,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	// User methods
	async createUserEntity(data: CreateUserDto, opt: UserOpt){
		const userKey = this.key(['User', opt.user]);
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.uid = opt.user;
		data.userName = data.userName.toLowerCase();
		const entity = {
			key: userKey,
			data: data
		}
		try {
			await this.insert(entity)

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'User',
				id: userKey.name,
				action: 'create',
				time: opt.time,
			}

			const searchRecord = {
				objectID: entity.key.name,
				username: data.userName,
				created: data.created,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('users').saveObject(searchRecord).wait();

			return {entity, history: await this.createHistory(historyObj)}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateUserEntity(data: UpdateUserDto, opt: UserOpt){
		const userKey = this.key(['User', opt.user]);
		data.lastUpdated = opt.time;
		if(data.userName){
			data.userName = data.userName.toLowerCase();
		}

		try {
			const [entity] = await this.get(userKey);

			if(entity.role != 'member' && data.userName){
				throw new BadRequestException("Verified users cannot change usernames")
			}

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
			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'User',
				id: userKey.name,
				action: 'update',
				time: opt.time
			}

			const searchRecord = {
				objectID: entity[this.KEY]['name'],
				username: data.userName,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('users').partialUpdateObject(searchRecord).wait();

			return {entity, history: await this.createHistory(historyObj)}
		} catch(err: any) {
			throw new BadRequestException(err.message);
		}
	}

	// UserPhoto methods
	async createUserPhotoEntity(data: CreateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, opt.parentId, 'UserPhoto', opt.imageId]);
		data.photoIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: photoKey,
			data: data
		}

		const query = this.createQuery('UserPhoto').hasAncestor(this.key([opt.parentKind, opt.parentId]));
		try {
			const [existing] = await this.runQuery(query);

			if(existing.length > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}
			
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'UserPhoto',
				id: photoKey.name,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateUserPhotoEntity(data: UpdateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, opt.parentId, 'UserPhoto', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(photoKey);

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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'UserPhoto',
				id: photoKey.name,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async createVotesEntity(data: CreateVotesDto, opt: VoteOpt){
		const voteKey = this.key('Vote');
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: voteKey,
			data: data
		}
		try {
			await this.insert(entity)
			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Vote',
				id: voteKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Vote',
				id: voteKey.id,
				action: 'update',
				time: opt.time
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async createRequestEntity(data: CreateRequestDto, opt:RequestOpt){
		const requestKey = this.key('Request');
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.approved = false
		const entity = {
			key: requestKey,
			data: data
		}

		try {
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Request',
				id: requestKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
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

			await this.update(entity)

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Request',
				id: requestKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// List Rating Methods
	async calculateRatingScore(results: any[]){
		const criticsQuery = this.createQuery('User').filter('role', '=', 'journalist');
		try{
			const [critics] = await this.runQuery(criticsQuery);
			const sampleCap = critics.length;
			const totalRatings = results.length;

			const upLists = results.filter((val) => val.listRating == 'u').length;
			const neutralLists = results.filter((val) => val.listRating == 'n').length;
			const downLists = results.filter((val) => val.listRating == 'd').length;
			
			const upPoints = upLists*1;
			const neutralPoints = neutralLists*0.5;
			const downPoints = downLists*0.1;

			const averageRatingsPercentage = ((upPoints+neutralPoints+downPoints)/totalRatings)*100;
			const raterSamplePercentage = (totalRatings/sampleCap)*100;
			
			const listScore = ((averageRatingsPercentage+raterSamplePercentage)/200)*100;

			const info = {
				up: upLists,
				neutral: neutralLists,
				down: downLists,
				totalRatings: totalRatings,
				listScore: listScore
			}

			return info
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}
	async createListRatingEntity(data: CreateListRatingDto, opt: RatingOpt){
		const ratingKey = this.key([opt.parentKind, +opt.parentId, 'Rating']);
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.authorUid = opt.user

		if(data.reviewLink.slice(0,8) !== 'https://'){throw new BadRequestException(`The review link must begin with the secure protocol, "https://"`)}

		const parentKey = this.key([opt.parentKind, +opt.parentId]);
		const query = this.createQuery('Rating').hasAncestor(parentKey);

		const validationQuery = this.createQuery('Rating').hasAncestor(parentKey).filter('authorUid', '=', opt.user);

		const userKey = this.key(['User', opt.user]);
		try {
			const [existingReviews] = await this.runQuery(validationQuery);
			if(existingReviews.length > 0) {throw new BadRequestException("You can only review once")};

			const [user] = await this.get(userKey);
			data.author = user.userName;


			const entity = {
				key: ratingKey,
				data: data
			}

			await this.insert(entity);

			// Calculate the rating score
			const [results] = await this.runQuery(query);
			const info = await this.calculateRatingScore(results);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Rating',
				id: ratingKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history, info}
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updateListRatingEntity(data: UpdateListRatingDto, opt: RatingOpt){
		const ratingKey = this.key([opt.parentKind, +opt.parentId, 'Rating', +opt.imageId]);
		data.lastUpdated = opt.time;

		const parentKey = this.key([opt.parentKind, +opt.parentId]);
		const query = this.createQuery('Rating').hasAncestor(parentKey);
		try {
			const [entity] = await this.get(ratingKey);

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			await this.update(entity);

			// Calculate the rating score
			const [results] = await this.runQuery(query);
			const info = await this.calculateRatingScore(results);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Rating',
				id: ratingKey.id,
				action: 'update',
				time: opt.time,
			}

			const history = await this.createHistory(historyObj);
			return {entity, history, info}
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	// Still methods
	async createStillEntity(data: CreateStillDto, opt: ImageOpt){
		const stillKey = this.key([opt.parentKind, +opt.parentId, 'Still', opt.imageId]);
		data.stillIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: stillKey,
			data: data
		}

		const query = this.createQuery('Still').hasAncestor(this.key([opt.parentKind, +opt.parentId]));
		try {
			const [existing] = await this.runQuery(query);

			if(existing.length >= 3) {
				throw new BadRequestException("Too many stills for a single resource");
			}
			
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Still',
				id: stillKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateStillEntity(data: UpdateStillDto, opt: ImageOpt){
		const stillKey = this.key([opt.parentKind, +opt.parentId, 'Still', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(stillKey);

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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Still',
				id: stillKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	// Poster methods
	async createPosterEntity(data: CreatePosterDto, opt: ImageOpt){
		const posterKey = this.key([opt.parentKind, +opt.parentId, 'Poster', opt.imageId]);
		data.posterIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: posterKey,
			data: data
		}
		const query = this.createQuery('Poster').hasAncestor(this.key([opt.parentKind, +opt.parentId]));
		try {
			const [existing] = await this.runQuery(query);

			if(existing.length >= 1) {
				throw new BadRequestException("Too many posters for a single resource");
			}

			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Poster',
				id: posterKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updatePosterEntity(data: UpdatePosterDto, opt: ImageOpt){
		const posterKey = this.key([opt.parentKind, +opt.parentId, 'Poster', opt.imageId]);
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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Poster',
				id: posterKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch (err: any){
			throw new BadRequestException(err.message);
		}
	}

	// Person methods
	async createPersonEntity(data: CreatePersonDto, opt: PersonOpt){
		const personKey = this.key('Person');
		data.created = opt.time;
		data.lastUpdated = opt.time;
		const entity = {
			key: personKey,
			data: data
		}
		try {
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Person',
				id: personKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				objectID: entity.key.id,
				name: data.name,
				profilePhotoUrl: data.profilePhotoUrl,
				created: data.created,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('people').saveObject(searchRecord).wait();

			return { entity, history }
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Person',
				id: personKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				objectID: entity[this.KEY]['id'],
				name: data.name,
				profilePhotoUrl: data.profilePhotoUrl,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('people').partialUpdateObject(searchRecord).wait();

			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// PersonPhoto methods
	async createPersonPhotoEntity(data: CreateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'PersonPhoto', opt.imageId]);
		data.photoIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: photoKey,
			data: data
		}

		const query = this.createQuery('PersonPhoto').hasAncestor(this.key([opt.parentKind, +opt.parentId]));
		try {
			const [existing] = await this.runQuery(query);

			if(existing.length > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}
			
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'PersonPhoto',
				id: photoKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updatePersonPhotoEntity(data: UpdateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'PersonPhoto', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(photoKey);

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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'PersonPhoto',
				id: photoKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	// PersonRole methods
	async createPersonRoleEntity(data: CreatePersonRoleDto, opt: PersonRoleOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;
		data.personId = opt.personId;		
		// Creates the role
		const roleKey = this.key(['Person', +opt.personId, 'PersonRole']);
		const entity = {
			key: roleKey,
			data: data
		}

		try {
			await this.insert(entity);

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'PersonRole',
				id: roleKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch(err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updatePersonRoleEntity(data: UpdatePersonRoleDto, opt: PersonRoleOpt){
		
		const personKey = this.datastore.key(['Person', +opt.personId]);
			
		const roleKey = this.key(['Person', +personKey.id, 'PersonRole', +opt.roleId]);				
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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'PersonRole',
				id: roleKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			return { entity, history }
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// Company methods
	async createCompanyEntity(data: CreateCompanyDto, opt: CompanyOpt){
		const companyKey = this.key('Company');
		data.created = opt.time;
		data.lastUpdated = opt.time;
		const entity = {
			key: companyKey,
			data: data
		}
		try {
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Company',
				id: companyKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				objectID: entity.key.id,
				name: data.name,
				profilePhotoUrl: data.profilePhotoUrl,
				created: data.created,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('companies').saveObject(searchRecord).wait();

			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Company',
				id: companyKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				objectID: entity[this.KEY]['id'],
				name: data.name,
				profilePhotoUrl: data.profilePhotoUrl,
				created: data.created,
				lastUpdated: data.lastUpdated
			}
			await this.algolia.initIndex('companies').partialUpdateObject(searchRecord).wait();

			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// CompanyPhoto methods
	async createCompanyPhotoEntity(data: CreateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'CompanyPhoto', opt.imageId]);
		data.photoIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		const entity = {
			key: photoKey,
			data: data
		}

		const query = this.createQuery('CompanyPhoto').hasAncestor(this.key([opt.parentKind, +opt.parentId]));
		try {
			const [existing] = await this.runQuery(query);

			if(existing.length > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}
			
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'CompanyPhoto',
				id: photoKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateCompanyPhotoEntity(data: UpdateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'CompanyPhoto', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(photoKey);

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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'CompanyPhoto',
				id: photoKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	// CompanyRole methods
	async createCompanyRoleEntity(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.ownerKind = opt.parentKind;
		data.ownerId = opt.parentId;
		data.companyId = opt.companyId	
		// Create the role
		const companyKey = this.key(['Company', +opt.companyId]);
		const roleKey = this.key(['Company', +companyKey.id, 'CompanyRole']);
		const entity = {
			key: roleKey,
			data: data
		}

		try {
			await this.insert(entity);

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'CompanyRole',
				id: roleKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any){
			throw new NotFoundException(err.message);
		}
	}

	async updateCompanyRoleEntity(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		const companyKey = this.datastore.key(['Company', +opt.companyId]);
		
		const roleKey = this.datastore.key(['Company', +companyKey.id, 'CompanyRole', +opt.roleId]);
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

			await this.update(entity);

			// Creates history
			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'CompanyRole',
				id: roleKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// Platform methods
	async createPlatformEntity(data: CreatePlatformDto, opt: PlatformOpt){
		const platformKey = this.key('Platform');
		data.created = opt.time;
		data.lastUpdated = opt.time;
		const entity = {
			key: platformKey,
			data: data
		}

		try {
			await this.insert(entity);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Platform',
				id: platformKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return { entity, history }
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
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

			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Platform',
				id: platformKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// Link methods
	async createLinkEntity(data: CreateLinkDto, opt: LinkOpt){
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
		try {
			await this.insert(entity);
			// Creates history
			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Link',
				id: linkKey.id,
				action: 'create',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return { entity, history }
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
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

			await this.update(entity);

			// Creates history
			const historyObj: HistoryOpt = {
				dataObject: entity,
				user: opt.user,
				kind: 'Link',
				id: platformKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);
			return { entity, history }
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}
}