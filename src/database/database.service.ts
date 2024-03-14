import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HistoryOpt, ImmutableFields, Collection, CollectionFields, HistoryX, Hit, DecodedHistory } from './database.types';
import {
	Rating,
} from '../films/films.types';
import { UserExt } from '../users/users.types';
import { MongoClient, Db, OptionalUnlessRequiredId, Filter } from 'mongodb';

@Injectable()
export class DatabaseService {
	constructor(private config: ConfigService){}

	// Mongo
	private client: MongoClient
	public db: Db

	public async connectDB(){              
		try {
			this.client = await new MongoClient(this.config.get('ATLAS_URI')).connect();
			this.db = this.client.db(this.config.get('MONGO_DATABASE'));
			console.log('Connected to MongoDB on the '+this.config.get('MONGO_DATABASE')+' database.')
		} catch(err: any) {
			console.log("Error: "+err.message)
		} finally {
			// Ensures that the client will close when you finish/error
			await new MongoClient(this.config.get('ATLAS_URI')).close()
		}
	}

	private async enforceUnique(collection: string, idValue: string): Promise<void> {
		try {
			const count = await this.db.collection(collection).countDocuments({id: idValue})
			if(count > 0) { throw new BadRequestException(`Error: duplicate ${collection} values`) }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	public generateId(): string {
		return Date.now().toString()
	}

	private generateRandomString(length: number) {
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let randomString = '';

		for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * charset.length);
			randomString += charset.charAt(randomIndex);
		}

		return randomString;
	}

	public async generateUniqueId(collection: Collection, length: number): Promise<string> {
		const uid = this.generateId()+this.generateRandomString(length);
		try {
			const exist = await this.db.collection(collection).countDocuments({ id: uid });

			if(exist > 0){
				return await this.generateUniqueId(collection, length);
			}

			return uid;
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}

	public async insertOne<T extends ImmutableFields>(data: OptionalUnlessRequiredId<T>, collection: Collection){
		try {
			await this.enforceUnique(collection, data.id)
			const doc = await this.db.collection<T>(collection).insertOne(data)
			return doc
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	public async updateOne<T extends ImmutableFields>(data: T, collection: Collection, unset?: CollectionFields<T>){
		let filteredUnsetValues: (keyof T)[];
		if(unset){ filteredUnsetValues = unset.filter(val => val !== 'id') }
		let valuesToRemove: any = {}
		if(filteredUnsetValues){
			for( const val of filteredUnsetValues){
				delete data[val]
				valuesToRemove[val] = ''
			}
		}
		try {                   
			const {id, ...others } = data
			const { value } = await this.db.collection<T>(collection).findOneAndUpdate({id: id} as Filter<T>, { $set: others as Partial<T>, $unset: valuesToRemove }, {returnDocument: 'after'})
			return value
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	formatTitle(title: string){
		const specialWords = ["a", "A", "an", "An", "the", "The", "of", "Of", 'by', 'By', 'and', 'And']
		const workingSentence = title.split(" ")
		const final = workingSentence.map((word, index) => {			
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
		
		return final.join(" ")
	}

	dateToBigInt(date: Date){
		return Math.floor(Number(new Date(date))/1000);
	}


	// History methods
	async createHistory(opt: HistoryOpt){
		try {
			const history: HistoryX = {
				xBefore: opt.prevDataObject,
				xAfter: opt.dataObject,
				xIdentifier: opt.id,
				wIdentifier: opt.pId, // Parent Identifier, if any.
				xKind: opt.kind,
				wKind: opt.pKind, // Parent Kind, if any.
				xAction: opt.action,
				xUser: opt.user,
				xTimestamp: opt.time,
				id: await this.generateUniqueId('history', 36)
			}
			await this.insertOne(history, 'history')
			return history
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	historyFiltration(obj: HistoryX){
		const before = obj.xBefore;
		const after = obj.xAfter;
		const action = obj.xAction;
		const time = obj.xTimestamp;
		const user = obj.xUser;
		const oid = obj.xIdentifier; // document id
		const id = obj.id;

		const excludedProps = [
			'created', 'lastUpdated', 'editVerified',
			'editLocked', 'isHidden', 'parentId',
			'parentKind', 'posterIndex', 'stillIndex',
			'photoIndex', 'author', 'authorUid',
			'ownerId', 'ownerKind', 'companyId',
			'personId', 'uid', 'lastVerified', 
			'originalName', 'originalDimensions', 'originalSize',
			'hdUrl', 'hdDimensions', 'hdSize',
			'hdName', 'sdName', 'sdUrl', 
			'sdDimensions', 'sdSize', 'lqName',
			'lqUrl', 'lqDimensions', 'lqSize', 
			'source', 'sourceLink', 'hasPoster', 'id',
			'parentCollection', 'ownerCollection', 'optimisedUrl',
			'optimisedName', 'optimisedSize', 'optimisedDimensions'
		]

		const results: {
			before: any;
			after: any;
			property: string;
			message: 'update' |'create' | 'delete';
			userUid: string;
			time: Date;
			id: string;
			oid: string;
		}[] = []
		// console.log('before', typeof before, action, obj.xKind, oid, time)
		// console.log('after', typeof after, action, obj.xKind, oid, time)
		if(action === 'update' && typeof before === 'object' && typeof after === 'object'){
			for (const key in after) {
				if(before?.hasOwnProperty(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]) && excludedProps.indexOf(key) < 0){
					// console.log(key, oid, action, obj.xKind, time)
					results.push({
						before: before[key],
						after: after[key],
						property: key,
						message: 'update',
						userUid: user,
						time: time,
						id: id,
						oid: oid
					})
				} else if( !before.hasOwnProperty(key) && excludedProps.indexOf(key) < 0 ) {
					results.push({
						before: null,
						after: after[key],
						property: key,
						message: 'create',
						userUid: user,
						time: time,
						id: id,
						oid: oid
					})
				}
			}

			for (const key in before) {
				if( !after.hasOwnProperty(key) && excludedProps.indexOf(key) < 0 ){
					results.push({
						before: before[key],
						after: null,
						property: key,
						message: 'delete',
						userUid: user,
						time: time,
						id: id,
						oid: oid
					})
				}
			}
		} else if(action === 'create'){
			for (const key in after){
				if(excludedProps.indexOf(key) < 0){
					results.push({
						before: null,
						after: after[key],
						property: key,
						message: 'create',
						userUid: user,
						time: time,
						id: id,
						oid: oid
					})
				}
			}
		} else if(action === 'delete'){
			for (const key in after){
				if(excludedProps.indexOf(key) < 0){
					results.push({
						before: after[key],
						after: null,
						property: key,
						message: 'delete',
						userUid: user,
						time: time,
						id: id,
						oid: oid
					})
				}
			}
		}

		return results
	}

	async decodeHistory(arr: HistoryX[]){
		const results: {
			before: any;
			after: any;
			property: string;
			message: 'update' |'create' | 'delete';
			userUid: string;
			time: Date;
			id: string;
			oid: string;
		}[] = []
		try {			
			for(let i = 0; i < arr.length; i++){
				let actions = this.historyFiltration(arr[i]);
				actions = await Promise.all(
					actions.map(async (val) => {
						const user = await this.db.collection<UserExt>('users').findOne({id: val.userUid})
						
						if(user){val['username'] = user.username}

						return val
					})
				)
				results.push(...actions)
			}

			return results.sort((a, b) => {
				if(new Date(a.time) > new Date(b.time)){
					return -1
				} else {
					return 0
				}
			})
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}	

	determineUserReputation(history: HistoryX[]){
		const userScore: {[key: string]: number} = {}
		const modifications: {[key: string]: {
			[key: string]: {
				before: any;
				after: any;
				property: string;
				message: 'update' |'create' | 'delete';
				userUid: string;
				time: Date;
				id: string;
				oid: string;
			}[]
		}} = {}

		// Get individual property edits
		const edits = history.map(item => this.historyFiltration(item)).flat().sort((a, b) => a.time > b.time ? 1 : -1)

		// Map the properties
		for(const edit of edits){
			userScore[edit.userUid] = userScore[edit.userUid] || 2;

			// Add document to modifications if it doesn't exist
			if(!modifications[edit.oid]){ modifications[edit.oid] }

			// Add a property to the document on the modifications if it doesn't exist
			if(!modifications[edit.oid][edit.property]){ modifications[edit.oid][edit.property] }

			// Add the edit of the specific property to the appropitate document
			modifications[edit.oid][edit.property].push(edit)
		}

		// Function for point assignment
		const assignPoints = (userId: string, points: number) => {
			if(!userScore[userId]){ userScore[userId] = 2 }
			userScore[userId] += points
		}

		// Iterate through each document and property modification to assign points to contributor
		for (const documentId in modifications){
			const properties = modifications[documentId]

			for (const propertyName in properties){
				 const modification = properties[propertyName]

				for(let i = 0; i < modification.length - 1; i++){
					const currentState = modification[i]
					const nextState = modification[i]

					if(currentState.userUid !== nextState.userUid){

						if(nextState.message === 'update'){
							assignPoints(currentState.userUid, -1)
							assignPoints(nextState.userUid, 1)
						} else if(nextState.message === 'delete'){
							assignPoints(nextState.userUid, -2)
						} else if(nextState.message === 'create'){
							assignPoints(nextState.userUid, 2)
						}

					}
				}

			}

		}

		return Object.entries(userScore)

	}

	async get24HourEdits(userId: string){
		const oneDayAgo = new Date(Number(new Date)-(1000*60*60*24));
		try {
			const editsSoFar = await this.db.collection<HistoryX>('history').countDocuments({
				xUser: userId,
				xTimestamp: {$gt: oneDayAgo}
			})
			return editsSoFar
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async validateEditsQuota(userId: string){
		try {
			const edits = await this.get24HourEdits(userId)
			const valid = edits > 15 ? false : true
			return valid
		} catch (err: any){
			throw new BadRequestException('You have your daily quota')
		}
	}

	// Frequency methods
	async addHit(kind: Collection, id: string){
		try {
			const hit: Hit = {
				id: await this.generateUniqueId('hits', 36),
				collection: kind,
				identifier: id,
				time: new Date
			}
			await this.insertOne(hit, 'hits');
			return hit
		} catch (err: any){
			throw new BadRequestException()
		}
	}

	// List Rating Methods
	async calculateRatingScore(results: Rating[]){
		try{
			// 33% ratings total + 33% critics sample + 33% total critics reputation
			

			const critics = await this.db.collection<UserExt>('users').find({role: 'journalist'}).toArray()
			const sampleCap = critics.length;
			const totalRatings = results.length;

			const totalCriticsScore = critics.reduce((sumSoFar, critic) => sumSoFar + ( critic.criticScore ? critic.criticScore : 0 ) , 0)
			const thisFilmCriticsScore = critics.filter( item => { 
				const hasReviewedThisFilm = results.filter(val => val.authorUid === item.id).length > 0 ? true : false
				return hasReviewedThisFilm
			} ).reduce((sum, item) => sum + ( item.criticScore ? item.criticScore : 0 ) , 0)

			const upLists = results.filter((val) => val.listRating == 'u').length;
			const neutralLists = results.filter((val) => val.listRating == 'n').length;
			const downLists = results.filter((val) => val.listRating == 'd').length;
			
			const upPoints = upLists*1;
			const neutralPoints = neutralLists*0.5;
			const downPoints = downLists*0.1;

			const averageRatingsPercentage = ((upPoints+neutralPoints+downPoints)/totalRatings)*100;
			const criticsSamplePercentage = (totalRatings/sampleCap)*100;
			const criticScorePercentage = (thisFilmCriticsScore/totalCriticsScore)*100;
			
			const listScore = ((averageRatingsPercentage+criticsSamplePercentage+criticScorePercentage)/300)*100;

			const info = {
				up: upLists,
				neutral: neutralLists,
				down: downLists,
				totalRatings: totalRatings,
				listScore: Math.round(listScore)
			}

			return info
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	/**
	async recursiveQueries(cursor: string, query: any) {
		const queryTakeOff = query.start(cursor);
		
		const results = await this.runQuery(queryTakeOff);
		const entities = results[0];
		let info = results[1];
	
		if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
			const nextResults = await this.recursiveQueries(info.endCursor, query);
	
			// Concatenate entities
			results[0] = entities.concat(nextResults[0]);
			info = nextResults[1];
		}
	
		return {entities, info};
	}

	// Search methods
	async indexAll(){
		let filmsQuery = this.createQuery('Film').limit(200);
		let peopleQuery = this.createQuery('Person').limit(200);
		let companiesQuery = this.createQuery('Company').limit(200);
		let contentQuery = this.createQuery('Content').limit(200);
		let usersQuery = this.createQuery('User').limit(200);

		const films = []
		const people = []
		const companies = []
		const content = []
		const users = []
		try {
			// Films
			let [filmsResults, filmsOptions] = await this.runQuery(filmsQuery);
			filmsResults = await Promise.all(
				filmsResults.map(async (item) => {
					const [photo] = await this.get(this.key(['Film', +item[this.KEY]['id'],'Poster', '0']));
					const [directors] = await this.createQuery('PersonRole').filter('ownerKind', '=', 'Film').filter('ownerId', '=', item[this.KEY]['id']).filter('title', '=', 'Director').run()
					const directorNames = directors.map(val => val.personName)
					// console.log(directors.length, item.name)
					// console.log(photo?.hdUrl, item.name)
					return {
						id: item[this.KEY]['id'],
						name: item.name,
						year: item.year,
						genres: item.genres,
						type: item.type,
						format: item.format,
						productionStage: item.productionStage,
						releaseDate: this.dateToBigInt(item.releaseDate),
						initialPlatform: item.initialPlatform,
						created: this.dateToBigInt(item.created),
						lastUpdated: this.dateToBigInt(item.lastUpdated),
						posterUrl: photo?.hdUrl,
						logline: item.logline,
						directors: directorNames
					}
				})
			)
			films.push(...filmsResults);
			if(filmsOptions.moreResults !== this.NO_MORE_RESULTS) {
				let moreFilms = await this.recursiveQueries(filmsOptions.endCursor, filmsQuery);
				moreFilms.entities = await Promise.all(
					moreFilms.entities.map(async (item) => {
						const [photo] = await this.get(this.key(['Film', +item[this.KEY]['id'],'Poster', '0']));
						const [directors] = await this.createQuery('PersonRole').filter('ownerId', '=', `${item[this.KEY]['id']}`).filter('title', '=', 'Director').run()
						const directorNames = directors.map(val => val.personName)
						return {
							id: item[this.KEY]['id'],
							name: item.name,
							year: item.year,
							genres: item.genres,
							type: item.type,
							format: item.format,
							productionStage: item.productionStage,
							releaseDate: this.dateToBigInt(item.releaseDate),
							initialPlatform: item.initialPlatform,
							created: this.dateToBigInt(item.created),
							lastUpdated: this.dateToBigInt(item.lastUpdated),
							posterUrl: photo?.hdUrl,
							logline: item.logline,
							directors: directorNames
						}
					})
				)
				films.push(...moreFilms.entities)
			}

			// People
			let [peopleResults, peopleOptions] = await this.runQuery(peopleQuery);
			peopleResults = await Promise.all(
				peopleResults.map(async (item) => {
					const [photo] = await this.get(this.key(['Person', +item[this.KEY]['id'],'PersonPhoto', '0']));
					return {
						id: item[this.KEY]['id'],
						name: item.name,
						occupation: item.occupation,
						yearOfBirth: item.yearOfBirth,
						cityOfOrigin: item.cityOfOrigin,
						provinceOfOrigin: item.provinceOfOrigin,
						gender: item.gender,
						pronouns: item.pronouns,
						description: item.description,
						countryOfOrigin: item.countryOfOrigin,
						nationality: item.nationality,
						deathDate: this.dateToBigInt(item.deathDate),
						created: this.dateToBigInt(item.created),
						lastUpdated: this.dateToBigInt(item.lastUpdated),
						photoUrl: photo?.hdUrl
					}
				})
			)
			people.push(...peopleResults);
			if(peopleOptions.moreResults !== this.NO_MORE_RESULTS) {
				const morePeople = await this.recursiveQueries(peopleOptions.endCursor, peopleQuery);
				morePeople.entities = await Promise.all(
					morePeople.entities.map(async (item) => {
						const [photo] = await this.get(this.key(['Person', +item[this.KEY]['id'],'PersonPhoto', '0']));
						return {
							id: item[this.KEY]['id'],
							name: item.name,
							occupation: item.occupation,
							yearOfBirth: item.yearOfBirth,
							cityOfOrigin: item.cityOfOrigin,
							provinceOfOrigin: item.provinceOfOrigin,
							gender: item.gender,
							pronouns: item.pronouns,
							description: item.description,
							countryOfOrigin: item.countryOfOrigin,
							nationality: item.nationality,
							deathDate: this.dateToBigInt(item.deathDate),
							created: this.dateToBigInt(item.created),
							lastUpdated: this.dateToBigInt(item.lastUpdated),
							photoUrl: photo?.hdUrl
						}
					})
				)
				people.push(...morePeople.entities)
			}

			// Companies
			let [companiesResults, companiesOptions] = await this.runQuery(companiesQuery);
			companiesResults = await Promise.all(
				companiesResults.map(async (item) => {
					const [photo] = await this.get(this.key(['Company', +item[this.KEY]['id'],'CompanyPhoto', '0']));
					return {
						id: item[this.KEY]['id'],
						name: item.name,
						founder: item.founder,
						director: item.director,
						founded: item.founded,
						description: item.description,
						country: item.country,
						city: item.city,
						created: this.dateToBigInt(item.created),
						lastUpdated: this.dateToBigInt(item.lastUpdated),
						photoUrl: photo?.hdUrl
					}
				})
			)
			companies.push(...companiesResults);
			if(companiesOptions.moreResults !== this.NO_MORE_RESULTS) {
				const moreCompanies = await this.recursiveQueries(companiesOptions.endCursor, companiesQuery);
				moreCompanies.entities = await Promise.all(
					moreCompanies.entities.map(async (item) => {
						const [photo] = await this.get(this.key(['Company', +item[this.KEY]['id'],'CompanyPhoto', '0']));
						return {
							id: item[this.KEY]['id'],
							name: item.name,
							founder: item.founder,
							director: item.director,
							founded: item.founded,
							description: item.description,
							country: item.country,
							city: item.city,
							created: this.dateToBigInt(item.created),
							lastUpdated: this.dateToBigInt(item.lastUpdated),
							photoUrl: photo?.hdUrl
						}
					})
				)
				companies.push(...moreCompanies.entities)
			}

			// Content
			let [contentResults, contentOptions] = await this.runQuery(contentQuery);
			contentResults = await Promise.all(
				contentResults.map(async (item) => {
					const [photo] = await this.get(this.key(['Content', +item[this.KEY]['id'],'ContentPhoto', '0']));
					return {
						id: item[this.KEY]['id'],
						author: item.author,
						headline: item.headline,
						tags: item.tags,
						slug: item.slug,
						created: this.dateToBigInt(item.created),
						lastUpdated:this.dateToBigInt(item.lastUpdated),
						photoUrl: photo?.hdUrl
					}
				})
			)
			content.push(...contentResults);
			if(contentOptions.moreResults !== this.NO_MORE_RESULTS) {
				const moreContent = await this.recursiveQueries(contentOptions.endCursor, contentQuery);
				moreContent.entities = await Promise.all(
					moreContent.entities.map(async (item) => {
						const [photo] = await this.get(this.key(['Content', +item[this.KEY]['id'],'ContentPhoto', '0']));
						return {
							id: item[this.KEY]['id'],
							author: item.author,
							headline: item.headline,
							tags: item.tags,
							slug: item.slug,
							created: this.dateToBigInt(item.created),
							lastUpdated:this.dateToBigInt(item.lastUpdated),
							photoUrl: photo?.hdUrl
						}
					})
				)
				content.push(...moreContent.entities)
			}

			// Users
			let [usersResults, usersOptions] = await this.runQuery(usersQuery);
			usersResults = await Promise.all(
				usersResults.map(async (item) => {
					const [photo] = await this.get(this.key(['User', item[this.KEY]['name'],'UserPhoto', '0']));
					return {
						id: item[this.KEY]['name'],
						userName: item.userName,
						displayName: item.displayName,
						role: item.role,
						bio: item.bio,
						reputation: item.reputation,
						publication: item.publication,
						criticScore: item.criticScore,
						created: this.dateToBigInt(item.created),
						lastUpdated: this.dateToBigInt(item.lastUpdated),
						photoUrl: photo?.hdUrl
					}
				})
			)
			users.push(...usersResults);
			if(usersOptions.moreResults !== this.NO_MORE_RESULTS) {
				const moreUsers = await this.recursiveQueries(usersOptions.endCursor, usersQuery);
				moreUsers.entities = await Promise.all(
					moreUsers.entities.map(async (item) => {
						const [photo] = await this.get(this.key(['User', item[this.KEY]['name'],'UserPhoto', '0']));
						return {
							id: item[this.KEY]['name'],
							userName: item.userName,
							displayName: item.displayName,
							role: item.role,
							bio: item.bio,
							reputation: item.reputation,
							publication: item.publication,
							criticScore: item.criticScore,
							created: this.dateToBigInt(item.created),
							lastUpdated: this.dateToBigInt(item.lastUpdated),
							photoUrl: photo?.hdUrl
						}
					})
				)
				users.push(...moreUsers.entities)
			}

			const filmsJSONlines = films.map((item) => JSON.stringify(item)).join('\n');
			const peopleJSONlines = people.map((item) => JSON.stringify(item)).join('\n');
			const companiesJSONlines = companies.map((item) => JSON.stringify(item)).join('\n');
			const contentJSONlines = content.map((item) => JSON.stringify(item)).join('\n');
			const usersJSONlines = users.map((item) => JSON.stringify(item)).join('\n');

			const filmsRes = await this.search.collections('films').documents().import(filmsJSONlines, {action: 'upsert'});
			const peopleRes = await this.search.collections('people').documents().import(peopleJSONlines, {action: 'upsert'});
			const companiesRes = await this.search.collections('companies').documents().import(companiesJSONlines, {action: 'upsert'});
			const contentRes = await this.search.collections('content').documents().import(contentJSONlines, {action: 'upsert'});
			const usersRes = await this.search.collections('users').documents().import(usersJSONlines, {action: 'upsert'});
			// console.log(filmsRes, peopleRes, companiesRes, contentRes, usersRes)
			return {status: 'success'}
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	 
	// Content methods
	async createContentEntity(data: CreateContentDto, opt: ContentOpt){
		const contentKey = this.key('Content');
		const userKey = this.key(['User', opt.user])
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

			const [user] = await this.get(userKey);

			data.author = user.userName
			data.authorUid

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
				id: entity.key.id,
				author: data.author,
				headline: data.headline,
				tags: data.tags,
				slug: data.slug,
				created: this.dateToBigInt(data.created),
				lastUpdated:this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('content').saveObject(searchRecord).wait();
			await this.search.collections('content').documents().create(searchRecord);

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

			const dataBefore = {...entity};

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

			const dataAfter = {...entity};

			await this.update(entity);
			
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'Content',
				id: contentKey.id,
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				author: entity.author,
				headline: data.headline,
				tags: data.tags,
				slug: data.slug,
				lastUpdated: this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('content').partialUpdateObject(searchRecord).wait();
			await this.search.collections('content').documents(entity[this.KEY]['id']).update(searchRecord);

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
		data.parentId = opt.parentId;
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
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
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
		data.userName = data.userName.toLowerCase().replace(/[^0-9a-z]/gi, '');
		const entity = {
			key: userKey,
			data: data
		}
		try {
			// Update mailing list
			const record = await this.authService.getUserInfo(opt.user);
			const options = {
				method: 'POST',
				headers: {
					accept: 'application/json', 
					'content-type': 'application/json',
					'api-key': this.configService.get('BREVO_KEY')
				},
				body: JSON.stringify({
					email: record.email,
					ext_id: opt.user,
					attributes: {FNAME: entity.data.userName},
					emailBlacklisted: false,
					smsBlacklisted: false,
					listIds: [36],
					updateEnabled: false
				})
			};

			const res = await fetch('https://api.brevo.com/v3/contacts', options);
			const obj = await res.json()
			if(!res.ok){				
				throw new BadRequestException(obj)
			}

			entity.data.mailId = obj.id; // Add the mail list contact id

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
				id: entity.key.name,
				userName: data.userName,
				displayName: data.displayName,
				role: data.role,
				bio: data.bio,
				reputation: data.reputation,
				publication: data.publication,
				criticScore: data.criticScore,
				created: this.dateToBigInt(data.created),
				lastUpdated: this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('users').saveObject(searchRecord).wait();
			await this.search.collections('users').documents().create(searchRecord);

			return {entity, history: await this.createHistory(historyObj)}
		} catch (err: any) {
			console.log(err)
			throw new NotFoundException(err.message);
		}
	}

	async updateUserEntity(data: UpdateUserDto, opt: UserOpt){
		const userKey = this.key(['User', opt.user]);
		data.lastUpdated = opt.time;
		if(data.userName){
			data.userName = data.userName.toLowerCase().replace(/[^0-9a-z]/gi, '');
		}

		try {
			const [entity] = await this.get(userKey);
			const dataBefore = {...entity};

			if(!entity) {
				throw new BadRequestException("Action not allowed")
			}		

			if(entity.role != 'member' && data.userName){
				throw new BadRequestException("Verified users cannot change usernames")
			}

			// Modify existing data
			// for (const key in data) {
			// 	if(entity.hasOwnProperty(key)){
			// 		entity[key] = data[key]
			// 	} else {
			// 		entity[key] = data[key]
			// 	}
			// }

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					if(typeof data[key] === 'string'){
						// If the string is empty, delete the property
						if(data[key] === '') { delete entity[key] } else { entity[key] = data[key] };
					} else if(typeof data[key] === 'number') {
						// If the number is zero, delete the property
						if(data[key] === 0) { delete entity[key] } else { entity[key] = data[key] };
					} else if(typeof data[key] === 'object' && data[key] instanceof Date) {
						// If the date and time equals 1994/04/27 00:00:00 UTC+2, delete the property
						if(new Date(data[key]).toISOString() === new Date(767397600000).toISOString()) {
						  delete entity[key] 
						} else { 
							entity[key] = data[key] 
						};
					} else {
						entity[key] = data[key]
					}
				} else {
					entity[key] = data[key]
				}
			}

			// create a mailling list contact if it doesn't already exist
			const record = await this.authService.getUserInfo(opt.user);
			let performUpdate = true;
			if(!entity.hasOwnProperty('mailId')){
				const createContact = await fetch('https://api.brevo.com/v3/contacts', {
					method: 'POST',
					headers: {
						accept: 'application/json', 
						'content-type': 'application/json',
						'api-key': this.configService.get('BREVO_KEY')
					},
					body: JSON.stringify({
						email: record.email,
						ext_id: opt.user,
						attributes: {FNAME: entity.userName},
						emailBlacklisted: false,
						smsBlacklisted: false,
						listIds: [36],
						updateEnabled: false
					})
				})
				const createContactData = await createContact.json();
				if(!createContact.ok){				
					throw new BadRequestException(createContactData)
				}
				entity.mailId = createContactData.id;
				performUpdate = false;
			}


			const dataAfter = {...entity};
			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'User',
				id: userKey.name,
				action: 'update',
				time: opt.time
			}

			const searchRecord = {
				userName: data.userName,
				displayName: data.displayName,
				role: data.role,
				bio: data.bio,
				reputation: data.reputation,
				publication: data.publication,
				criticScore: data.criticScore,
				lastUpdated: this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('users').partialUpdateObject(searchRecord).wait();
			await this .search.collections('users').documents(entity[this.KEY]['name']).update(searchRecord);

			// update the mail list, only if it wasn't just created	
			if(entity.hasOwnProperty('mailId') && performUpdate === true){

				const updateContact = await fetch(`https://api.brevo.com/v3/contacts/${entity.mailId}`, {
					method: 'PUT',
					headers: {
						accept: 'application/json', 
						'content-type': 'application/json',
						'api-key': this.configService.get('BREVO_KEY')
					},
					body: JSON.stringify({
						attributes: {FNAME: entity.userName}
					})
				});

				// const updateContactData = await updateContact.json();
				// console.log(updateContact)
				if(!updateContact.ok){
					throw new BadRequestException(await updateContact.json())
				}
			}

			return {entity, history: await this.createHistory(historyObj)}
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException(err.message);
		}
	}

	// UserPhoto methods
	async createUserPhotoEntity(data: CreateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, opt.parentId, 'UserPhoto', opt.imageId]);
		data.photoIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.parentId = opt.parentId;
		const entity = {
			key: photoKey,
			data: data
		}

		const query = this.createQuery('UserPhoto').hasAncestor(this.key([opt.parentKind, opt.parentId]));
		try {
			const [existing] = await this.runQuery(query);

			if(existing.length > 2) {
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
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				photoUrl: data.hdUrl
			}
			await this.search.collections('users').documents(opt.parentId).update(searchRecord);

			return {entity, history}
		} catch (err: any) {
			// console.log(err)
			throw new NotFoundException(err.message);
		}
	}

	async updateUserPhotoEntity(data: UpdateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, opt.parentId, 'UserPhoto', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(photoKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'UserPhoto',
				id: photoKey.name,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	// Resquest Methods
	async createRequestEntity(data: CreateRequestDto, opt:RequestOpt){
		const requestKey = this.key('Request');
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.approved = false;
		data.acknowledged = false;
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
			const [entity] = await this.get(requestKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity)

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
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

	async createListRatingEntity(data: CreateListRatingDto, opt: RatingOpt){
		const ratingKey = this.key([opt.parentKind, +opt.parentId, 'Rating']);
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.authorUid = opt.user;
		data.parentId = opt.parentId;
		data.parentKind = opt.parentKind;

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
		const ratingKey = this.key([opt.parentKind, +opt.parentId, 'Rating', +opt.ratingId]);
		data.lastUpdated = opt.time;

		if(data.reviewLink && data.reviewLink?.slice(0,8) !== 'https://'){
			throw new BadRequestException(`The review link must begin with the secure protocol, "https://"`)
		}

		// const userKey = this.key(['User', opt.user]);

		const parentKey = this.key([opt.parentKind, +opt.parentId]);
		const query = this.createQuery('Rating').hasAncestor(parentKey);
		try {
			const [entity] = await this.get(ratingKey);
			const dataBefore = {...entity};

			if(entity.authorUid !== opt.user && !data.hasOwnProperty('editVerified')){ throw new BadRequestException('Action not allowed') }

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					entity[key] = data[key]
				} else {
					entity[key] = data[key]
				}
			}

			// Update critic reputation 
			if(data.hasOwnProperty('editVerified')){
				const authorKey = this.key(['User', entity.authorUid]);
				const [user] = await this.get(authorKey);
				if(!user.criticScore){
					user.criticScore = 1
				} else if(user.criticScore < 100){
					user.criticScore = user.criticScore+1
				}
				await this.update(user);
			}

			const dataAfter = {...entity};
			await this.update(entity);

			// Calculate the rating score
			const [results] = await this.runQuery(query);
			const info = await this.calculateRatingScore(results);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
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
		const filmKey = this.key([opt.parentKind, +opt.parentId]);

		const stillKey = this.key([opt.parentKind, +opt.parentId, 'Still', opt.imageId]);
		data.stillIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.parentId = opt.parentId;
		data.parentKind = opt.parentKind;
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

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Still',
				id: opt.imageId,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateStillEntity(data: UpdateStillDto, opt: ImageOpt){
		const filmKey = this.key([opt.parentKind, +opt.parentId]);

		const stillKey = this.key([opt.parentKind, +opt.parentId, 'Still', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(stillKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'Still',
				id: opt.imageId,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);
			return {entity, history};
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	// Poster methods
	async createPosterEntity(data: CreatePosterDto, opt: ImageOpt){
		const filmKey = this.key([opt.parentKind, +opt.parentId]);

		const posterKey = this.key([opt.parentKind, +opt.parentId, 'Poster', opt.imageId]);
		data.posterIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.parentId = opt.parentId;
		data.parentKind = opt.parentKind;
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

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'Poster',
				id: opt.imageId,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				posterUrl: data.hdUrl
			}
			// await this.algolia.initIndex('films').partialUpdateObject(searchRecord, {}).wait();
			await this.search.collections('films').documents(opt.parentId).update(searchRecord);

			return {entity, history};
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updatePosterEntity(data: UpdatePosterDto, opt: ImageOpt){
		const filmKey = this.key([opt.parentKind, +opt.parentId]);

		const posterKey = this.key([opt.parentKind, +opt.parentId, 'Poster', opt.imageId]);
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(posterKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'Poster',
				id: opt.imageId,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
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
		data.editVerified = false;
		data.editLocked = false;
		data.isHidden = false;
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
				id: entity.key.id,
				name: data.name,
				occupation: data.occupation,
				yearOfBirth: data.yearOfBirth,
				cityOfOrigin: data.cityOfOrigin,
				provinceOfOrigin: data.provinceOfOrigin,
				gender: data.gender,
				pronouns: data.pronouns,
				description: data.description,
				countryOfOrigin: data.countryOfOrigin,
				nationality: data.nationality,
				deathDate: this.dateToBigInt(data.deathDate),
				created: this.dateToBigInt(data.created),
				lastUpdated: this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('people').saveObject(searchRecord).wait();
			await this.search.collections('people').documents().create(searchRecord);

			return { entity, history }
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updatePersonEntity(data: UpdatePersonDto, opt: PersonOpt){
		data.lastUpdated = opt.time;
		const personKey = this.key(['Person', +opt.personId]);

		try {
			const [entity] = await this.get(personKey);
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			if(entity.editLocked === true && !data.hasOwnProperty('editLocked')){ throw new BadRequestException("Edit locked") }

			if( 
				!data.hasOwnProperty('isHidden') && 
				!data.hasOwnProperty('editLocked') &&
				!data.hasOwnProperty('editVerified') 
			) {	data.editVerified = false; }

			if(data.editVerified === true){
				data.lastVerified = opt.time;
			}

			// for (const key in data) {
			// 	if(entity.hasOwnProperty(key)){
			// 		entity[key] = data[key]
			// 	} else {
			// 		entity[key] = data[key]
			// 	}
			// }

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					if(typeof data[key] === 'string'){
						// If the string is empty, delete the property
						if(data[key] === '') { delete entity[key] } else { entity[key] = data[key] };
					} else if(typeof data[key] === 'number') {
						// If the number is zero, delete the property
						if(data[key] === 0) { delete entity[key] } else { entity[key] = data[key] };
					} else if(typeof data[key] === 'object' && data[key] instanceof Date) {
						// If the date and time equals 1994/04/27 00:00:00 UCT+2, delete the property
						if(new Date(data[key]).toISOString() === new Date(767397600000).toISOString()) {
						  delete entity[key] 
						} else { 
							entity[key] = data[key] 
						};
					} else {
						entity[key] = data[key]
					}
				} else {
					entity[key] = data[key]
				}
			}

			const dataAfter = {...entity};
			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'Person',
				id: JSON.stringify(personKey.id),
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				name: data.name,
				occupation: data.occupation,
				yearOfBirth: data.yearOfBirth,
				cityOfOrigin: data.cityOfOrigin,
				provinceOfOrigin: data.provinceOfOrigin,
				gender: data.gender,
				pronouns: data.pronouns,
				description: data.description,
				countryOfOrigin: data.countryOfOrigin,
				nationality: data.nationality,
				deathDate: this.dateToBigInt(data.deathDate),
				lastUpdated: this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('people').partialUpdateObject(searchRecord).wait();
			await this.search.collections('people').documents(personKey.id).update(searchRecord);

			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	// PersonPhoto methods
	async createPersonPhotoEntity(data: CreateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'PersonPhoto', opt.imageId]);
		const personKey = this.key(['Person', +opt.parentId]);
		data.photoIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.parentId = opt.parentId;
		const entity = {
			key: photoKey,
			data: data
		}

		const query = this.createQuery('PersonPhoto').hasAncestor(this.key([opt.parentKind, +opt.parentId]));

		const parentUpdate: UpdatePersonDto = {
			editVerified: false
		}

		const parentOptions: PersonOpt = {
			personId: opt.parentId,
			user: opt.user,
			time: opt.time
		}

		try {
			const [existing] = await this.runQuery(query);

			if(existing.length > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}
			
			await this.insert(entity);

			// Alert data change to the parent entity
			// const [person] = await this.get(personKey);
			// person.editVerified = false;
			// person.lastUpdated = opt.time;
			// await this.update(person);
			await this.updatePersonEntity(parentUpdate, parentOptions);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'PersonPhoto',
				id: photoKey.name,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const searchRecord = {
				photoUrl: data.hdUrl
			}
			// await this.algolia.initIndex('people').partialUpdateObject(searchRecord).wait();
			await this.search.collections('people').documents(opt.parentId).update(searchRecord);

			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updatePersonPhotoEntity(data: UpdateDisplayPhotoDto, opt: ImageOpt){
		const photoKey = this.key([opt.parentKind, +opt.parentId, 'PersonPhoto', opt.imageId]);
		const personKey = this.key(['Person', +opt.parentId]);
		data.lastUpdated = opt.time;

		const parentUpdate: UpdatePersonDto = {
			editVerified: false
		}

		const parentOptions: PersonOpt = {
			personId: opt.parentId,
			user: opt.user,
			time: opt.time
		}

		try {
			const [entity] = await this.get(photoKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			// Alert data change to the parent entity
			// const [person] = await this.get(personKey);
			// person.editVerified = false;
			// person.lastUpdated = opt.time;
			// await this.update(person);
			await this.updatePersonEntity(parentUpdate, parentOptions);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'PersonPhoto',
				id: photoKey.name,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
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

		const filmKey = this.key([opt.parentKind, +opt.parentId]);

		// Creates the role
		const roleKey = this.key(['Person', +opt.personId, 'PersonRole']);
		const entity = {
			key: roleKey,
			data: data
		}

		try {
			await this.insert(entity);

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);

			// Update search
			if(data.title === 'Director'){
				const [directors] = await this.createQuery('PersonRole').filter('ownerKind', '=', opt.parentKind).filter('ownerId', '=', opt.parentId).filter('title', '=', 'Director').run()
				const directorNames = directors.map(val => val.personName);

				const searchRecord = {
					directors: directorNames
				}

				await this.search.collections('films').documents(opt.parentId).update(searchRecord);
			}
			

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'PersonRole',
				id: roleKey.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch(err: any) {
			console.log(err)
			throw new NotFoundException(err.message);
		}
	}

	async updatePersonRoleEntity(data: UpdatePersonRoleDto, opt: PersonRoleOpt){
		
		const personKey = this.key(['Person', +opt.personId]);
		const filmKey = this.key([opt.parentKind, +opt.parentId]);
			
		const roleKey = this.key(['Person', +personKey.id, 'PersonRole', +opt.roleId]);				
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(roleKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);

			// Update search
			if(data.title === 'Director'){
				const [directors] = await this.createQuery('PersonRole').filter('ownerKind', '=', opt.parentKind).filter('ownerId', '=', opt.parentId).filter('title', '=', 'Director').run()
				const directorNames = directors.map(val => val.personName);
				console.log(directorNames)
				const searchRecord = {
					directors: directorNames
				}

				await this.search.collections('films').documents(opt.parentId).update(searchRecord);
			}

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'PersonRole',
				id: roleKey.id,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
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
		data.editVerified = false;
		data.editLocked = false;
		data.isHidden = false;

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
				id: entity.key.id,
				name: data.name,
				founder: data.founder,
				director: data.director,
				founded: data.founded,
				description: data.description,
				country: data.country,
				city: data.city,
				created: this.dateToBigInt(data.created),
				lastUpdated: this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('companies').saveObject(searchRecord).wait();
			await this.search.collections('companies').documents().create(searchRecord);

			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateCompanyEntity(data: UpdateCompanyDto, opt: CompanyOpt){
		data.lastUpdated = opt.time;
		const companyKey = this.key(['Company', +opt.companyId]);

		try {
			const [entity] = await this.get(companyKey);
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			if(entity.editLocked === true && !data.hasOwnProperty('editLocked')){ throw new BadRequestException("Edit locked") }

			if( 
				!data.hasOwnProperty('isHidden') && 
				!data.hasOwnProperty('editLocked') &&
				!data.hasOwnProperty('editVerified') 
			) {	data.editVerified = false; }

			if(data.editVerified === true){
				data.lastVerified = opt.time;
			}

			// for (const key in data) {
			// 	if(entity.hasOwnProperty(key)){
			// 		entity[key] = data[key]
			// 	} else {
			// 		entity[key] = data[key]
			// 	}
			// }

			for (const key in data) {
				if(entity.hasOwnProperty(key)){
					if(typeof data[key] === 'string'){
						// If the string is empty, delete the property
						if(data[key] === '') { delete entity[key] } else { entity[key] = data[key] };
					} else if(typeof data[key] === 'number') {
						// If the number is zero, delete the property
						if(data[key] === 0) { delete entity[key] } else { entity[key] = data[key] };
					} else if(typeof data[key] === 'object' && data[key] instanceof Date) {
						// If the date and time equals 1994/04/27 00:00:00 UTC+2, delete the property
						if(new Date(data[key]).toISOString() === new Date(767397600000).toISOString()) {
						  delete entity[key] 
						} else { 
							entity[key] = data[key] 
						};
					} else {
						entity[key] = data[key]
					}
				} else {
					entity[key] = data[key]
				}
			}

			const dataAfter = {...entity};
			await this.update(entity);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'Company',
				id: JSON.stringify(companyKey.id),
				action: 'update',
				time: opt.time,
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				name: data.name,
				founder: data.founder,
				director: data.director,
				founded: data.founded,
				description: data.description,
				country: data.country,
				city: data.city,
				lastUpdated: this.dateToBigInt(data.lastUpdated)
			}
			// await this.algolia.initIndex('companies').partialUpdateObject(searchRecord).wait();
			await this.search.collections('companies').documents(companyKey.id).update(searchRecord);

			return {entity, history}
		} catch(err: any){
			// console.log(err)
			throw new BadRequestException(err.message);
		}
	}

	// CompanyPhoto methods
	async createCompanyPhotoEntity(data: CreateDisplayPhotoDto, opt: ImageOpt){
		const companyKey = this.key([opt.parentKind, +opt.parentId]);

		const photoKey = this.key([opt.parentKind, +opt.parentId, 'CompanyPhoto', opt.imageId]);
		data.photoIndex = opt.imageId;
		data.lastUpdated = opt.time;
		data.created = opt.time;
		data.parentId = opt.parentId;
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

			// Alert data change to the parent entity
			const [company] = await this.get(companyKey);
			company.editVerified = false;
			company.lastUpdated = opt.time;
			await this.update(company);

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'CompanyPhoto',
				id: photoKey.name,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);

			const searchRecord = {
				photoUrl: data.hdUrl
			}
			// await this.algolia.initIndex('companies').partialUpdateObject(searchRecord).wait();
			await this.search.collections('companies').documents(opt.parentId).update(searchRecord);

			return {entity, history}
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateCompanyPhotoEntity(data: UpdateDisplayPhotoDto, opt: ImageOpt){
		const companyKey = this.key([opt.parentKind, +opt.parentId]);

		const photoKey = this.key([opt.parentKind, +opt.parentId, 'CompanyPhoto', opt.imageId]);
		data.lastUpdated = opt.time;
		try {
			const [entity] = await this.get(photoKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			// Alert data change to the parent entity
			const [company] = await this.get(companyKey);
			company.editVerified = false;
			company.lastUpdated = opt.time;
			await this.update(company);

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'CompanyPhoto',
				id: photoKey.name,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
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

		const filmKey = this.key([opt.parentKind, +opt.parentId]);

		// Create the role
		const companyKey = this.key(['Company', +opt.companyId]);
		const roleKey = this.key(['Company', +companyKey.id, 'CompanyRole']);
		const entity = {
			key: roleKey,
			data: data
		}

		try {
			await this.insert(entity);

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'CompanyRole',
				id: roleKey.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);
			return {entity, history}
		} catch (err: any){
			throw new NotFoundException(err.message);
		}
	}

	async updateCompanyRoleEntity(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		const filmKey = this.key([opt.parentKind, +opt.parentId]);

		const companyKey = this.datastore.key(['Company', +opt.companyId]);
		
		const roleKey = this.datastore.key(['Company', +companyKey.id, 'CompanyRole', +opt.roleId]);
		data.lastUpdated = opt.time;

		try {
			const [entity] = await this.get(roleKey);
			const dataBefore = {...entity};

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

			const dataAfter = {...entity};
			await this.update(entity);

			// Alert data change to the parent entity
			const [film] = await this.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.update(film);


			// Creates history
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'CompanyRole',
				id: roleKey.id,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.createHistory(historyObj);

			return {entity, history}
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	} */
}