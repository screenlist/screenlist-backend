import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HistoryOpt, ImmutableFields, Collection, CollectionFields, HistoryX, Hit, DecodedHistory, Freeze } from './database.types';
import {
	Rating,
} from '../films/films.types';
import { UserExt } from '../users/users.types';
import { MongoClient, Db, OptionalUnlessRequiredId, Filter } from 'mongodb';
import { randomBytes } from 'crypto'

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
		const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let randomString = '';
		const randomValues = randomBytes(length)

		for (let i = 0; i < length; i++) {
			randomString += charset[randomValues[i] % charset.length];
		}

		return randomString;
	}

	public async generateUniqueId(collection: Collection, length: number): Promise<string> {
		const uid = this.generateRandomString(length);
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

	async deleteFreeze(id: string){
		try {
			return await this.db.collection<Freeze>('freeze').deleteOne({id})
		} catch(err: any){
			throw new BadRequestException(err)
		}
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
			'source', 'sourceLink', 'hasPoster', 
			'id', 'parentCollection', 'ownerCollection', 
			'optimisedUrl', 'optimisedName', 'optimisedSize', 
			'optimisedDimensions', '_id', 'ownerName', 
			'parentName', 'source', 'uploadedByUser'
		]

		const results: DecodedHistory[] = []
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
		const results: DecodedHistory[] = []
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
		const userScore: {
			[key: string]: number
		} = {}

		// This holds original document IDs that contain the property names 
		// of the document's edited properties and the property names hold the edit version 
		// history of themselves in an array.
		/* 
			modifications example
			const modifications = {
				'173fYY80s00399d': {
					'name': DecodedHistory[],
					'country': DecodedHistory[],
					'nationality': DecodedHistory[]
				},
				'373fYY80s11325y': {
					'name': DecodedHistory[],
					'country': DecodedHistory[],
					'nationality': DecodedHistory[]
				}
			}
		*/
		const modifications: {
			[key: string]: {
				[key: string]: DecodedHistory[]
			}
		} = {}

		// Get individual property edits
		const edits = history.map(item => this.historyFiltration(item)).flat().sort((a, b) => Number(a.time) - Number(b.time))

		// Map the properties
		for(const edit of edits){
			userScore[edit.userUid] = userScore[edit.userUid] || 2;

			// Add document to modifications if it doesn't exist
			if(!modifications[edit.oid]){ modifications[edit.oid] = {} }

			// Add a property to the document on the modifications if it doesn't exist
			if(!modifications[edit.oid][edit.property]){ modifications[edit.oid][edit.property] = [] }

			// Add the edit of the specific property to the appropitate document
			modifications[edit.oid][edit.property].push(edit)
		}

		// Function for point assignment
		const assignPoints = (userId: string, points: number) => {
			if(!userScore[userId]){ userScore[userId] = 0 }
			userScore[userId] += points
		}

		// Iterate through each document and property modification to assign points to contributor
		for (const documentId in modifications){
			const properties = modifications[documentId]

			for (const propertyName in properties){
				const modification = properties[propertyName]

				// Points assignment for single edits
				if(modification.length === 1){

					const currentState = modification[0]

					switch(currentState.message){
						case 'create':
							assignPoints(currentState.userUid, 3)
							break;
						case 'update':
							assignPoints(currentState.userUid, 2)
							break;
						case 'delete':
							assignPoints(currentState.userUid, 3)
							break;
					}

				} else {

					for(let i = 0; i < modification.length - 1; i++){
						const currentState = modification[i]
						const nextState = modification[i+1]

						//  A Visible State is the last edit, what the moderator approves
						const isNextStateVisible =  i+2 === modification.length

						// Points assignment for multiple edits
						if(currentState.userUid !== nextState.userUid){

							// In the arrays, index 0 and 2 are for currentState while index 1 and 3 are for nextState
							// In both the first index is for non Visible State edit points
							// The edit messages are chained like pointsMatrix[currentState.message][nextState.message]
							const pointsMatrix = {
								create: {
									update: [-2, 1, -3, 3],
									delete: [-1, 1, -3, 2]
								},
								update: {
									update: [-1, 1, -1, 2],
									delete: [-1, -3, -2, 2]
								},
								delete: {
									create: [-2, 1, -4, 3]
								}
							}

							const currentPoints: number[] = pointsMatrix[currentState.message]?.[nextState.message]

							if (currentPoints) {
								assignPoints(currentState.userUid, currentPoints[isNextStateVisible ? 2 : 0]);
								assignPoints(nextState.userUid, currentPoints[isNextStateVisible ? 3 : 1]);
							}

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
				id: await this.generateUniqueId('hits', 64),
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
			// 33% ratings total + 33% critics sample + 33% total critics sample reputations
			

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

}