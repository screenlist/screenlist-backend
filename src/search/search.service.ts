import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import Typesense from 'typesense'
import { Collection } from 'src/database/database.types';
import { WithId } from 'mongodb';
import { Film, Photo } from 'src/films/films.types';
import { CompanySchema, ContentSchema, FilmSchema, PersonSchema, UserSchema } from './search.types';
import { Company, Role } from 'src/companies/companies.types';
import { Person } from 'src/people/people.types';
import { Content } from 'src/content/content.types';
import { UserExt } from 'src/users/users.types';

@Injectable()
export class SearchService {
	constructor(
		private config: ConfigService,
		private mongo: DatabaseService
	){
		this.createCollections()
		
	}

	// private compute = async () => await this.createCollections(); //Sets up Search Collections

	public client = new Typesense.Client({
		'nodes': [{
			'host': this.config.get('TYPESENSE_HOST'), // For Typesense Cloud use xxx.a1.typesense.net
			'port': +this.config.get('TYPESENSE_PORT'),      // For Typesense Cloud use 443
			'protocol': this.config.get('TYPESENSE_PROTOCOL')   // For Typesense Cloud use https
		}],
		'apiKey': this.config.get('TYPESENSE_KEY'),
		'connectionTimeoutSeconds': 2
	})

	async backUpData(){}

	async createCollections(){
		const filmSchema = {
			'name': 'films',
			'fields': [
				{ 'name': 'id',	'type': 'string',	'facet': false },
				{ 'name': 'name',	'type': 'string',	'facet': false },
				{ 'name': 'year', 'type': 'int32', 'facet': true, 'optional': true  },
				{ 'name': 'genres',	'type': 'string[]',	'facet': true },
				{ 'name': 'directors',	'type': 'string[]',	'facet': true, 'optional': true },
				{ 'name': 'type',	'type': 'string',	'facet': true },
				{ 'name': 'format',	'type': 'string',	'facet': true },
				{ 'name': 'productionStage',	'type': 'string',	'facet': true },
				{ 'name': 'releaseDate',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'listRatings',	'type': 'int32',	'facet': true, 'optional': true  },
				{ 'name': 'listScore',	'type': 'int32',	'facet': true, 'optional': true  },
				{ 'name': 'posterUrl',	'type': 'string',	'facet': false, 'index': false, 'optional': true },
				{ 'name': 'logline',	'type': 'string',	'facet': false, 'index': false, 'optional': true },
				{ 'name': 'initialPlatform',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'created',	'type': 'int64',	'facet': true },
				{ 'name': 'lastUpdated',	'type': 'int64',	'facet': true }
			]
		}

		const companySchema = {
			'name': 'companies',
			'fields': [
				{ 'name': 'id',	'type': 'string',	'facet': false },
				{ 'name': 'name',	'type': 'string',	'facet': false },
				{ 'name': 'description',	'type': 'string',	'facet': false, 'index': false, 'optional': true },
				{ 'name': 'created',	'type': 'int64',	'facet': true },
				{ 'name': 'lastUpdated',	'type': 'int64',	'facet': true },
				{ 'name': 'founded',	'type': 'int32',	'facet': true, 'optional': true  },
				{ 'name': 'country',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'director',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'founder',	'type': 'string',	'facet': true , 'optional': true },
				{ 'name': 'city',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'photoUrl',	'type': 'string',	'facet': false, 'index': false, 'optional': true }
			]
		}

		const personSchema = {
			'name': 'people',
			'fields': [
				{ 'name': 'id',	'type': 'string',	'facet': false },
				{ 'name': 'name',	'type': 'string',	'facet': false },
				{ 'name': 'description',	'type': 'string',	'facet': false, 'index': false, 'optional': true },
				{ 'name': 'occupation',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'yearOfBirth',	'type': 'int32',	'facet': true, 'optional': true  },
				{ 'name': 'cityOfOrigin',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'nationality',	'type': 'string[]',	'facet': true, 'optional': true  },
				{ 'name': 'gender',	'type': 'string',	'facet': true , 'optional': true },
				{ 'name': 'pronouns',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'provinceOfOrigin',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'countryOfOrigin',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'deathDate',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'dateMonthOfBirth',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'created',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'lastUpdated',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'photoUrl',	'type': 'string',	'facet': false, 'index': false, 'optional': true }
			]
		}

		const userSchema = {
			'name': 'users',
			'fields': [
				{ 'name': 'id',	'type': 'string',	'facet': false },
				{ 'name': 'username',	'type': 'string',	'facet': false },
				{ 'name': 'fullName',	'type': 'string',	'facet': false, 'optional': true  },
				{ 'name': 'role',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'reputation',	'type': 'int32',	'facet': true, 'optional': true  },
				{ 'name': 'publication',	'type': 'string',	'facet': true, 'optional': true  },
				{ 'name': 'criticScore',	'type': 'int32',	'facet': true, 'optional': true  },
				{ 'name': 'created',	'type': 'int64',	'facet': true },
				{ 'name': 'lastUpdated',	'type': 'int64',	'facet': true },
				{ 'name': 'photoUrl',	'type': 'string',	'facet': false, 'index': false, 'optional': true }
			]
		}

		const contentSchema = {
			'name': 'content',
			'fields': [
				{ 'name': 'id',	'type': 'string',	'facet': false },
				{ 'name': 'authorName',	'type': 'string',	'facet': true },
				{ 'name': 'authorId',	'type': 'string',	'facet': true },
				{ 'name': 'headline',	'type': 'string',	'facet': false, 'optional': true  },
				{ 'name': 'summary',	'type': 'string',	'facet': false, 'optional': true  },
				{ 'name': 'slug',	'type': 'string',	'facet': false },
				{ 'name': 'created',	'type': 'int64',	'facet': true },
				{ 'name': 'lastUpdated',	'type': 'int64',	'facet': true },
				{ 'name': 'photoUrl',	'type': 'string',	'facet': false, 'index': false, 'optional': true }
			]
		}

		const collectionsTypes = ['films', 'companies', 'people', 'users', 'content'];
		const compositeSchemas = [filmSchema, companySchema, personSchema, userSchema, contentSchema];
		
		try {
			// console.log('it runs')
			const collections = await this.client.collections().retrieve();
			// console.log(collections)
			if(typeof collections === 'object'){
				if(collectionsTypes.length !== collections.length){
					const availableCollections = []
					for(let i = 0; i < collections.length; i++){
						availableCollections.push(collections[i].name)
					}
					for(let i = 0; i < collectionsTypes.length; i++){
						if(availableCollections.indexOf(collectionsTypes[i]) === -1){
							await this.client.collections().create(compositeSchemas[i] as any);
						}
					}		
				}
			}
		} catch(err: any) {
			// console.log(err)  
			throw new BadRequestException(err.message);
		}
	}

	async deleteAllCollections() {
		const collectionsTypes = ['films', 'companies', 'people', 'users', 'content'];
		const availableCollections = []
		try {
			const collections = await this.client.collections().retrieve();

			for(let i = 0; i < collections.length; i++){
				availableCollections.push(collections[i].name)
			}

			for (let i = 0; i < collectionsTypes.length; i++){
				if(availableCollections.indexOf(collectionsTypes[i]) !== -1){ 
					await this.client.collections(collectionsTypes[i]).delete(); 
				}
			}
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}

	async getAllCollections() {
		try {
			return	await this.client.collections().retrieve()
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}

	async indexAll(){;

		try {
			// Films
			let filmsResults = await this.drillThrough<Film>('films')
			const films = await Promise.all(
				filmsResults.map(async (item): Promise<FilmSchema> => {
					const photo = await this.mongo.db.collection<Photo>('photos').findOne({
						parentCollection: 'films',
						parentId: item.id,
						type: 'poster',
						photoIndex: 0
					})
					const directors = await this.mongo.db.collection<Role>('roles').find({
						ownerCollection: 'films',
						parentCollection: 'people',
						ownerId: item.id,
						role: 'Director'
					}).toArray()

					const directorNames = directors.map(val => val.parentName)

					return {
						id: item.id,
						name: item.name,
						year: item.year,
						genres: item.genres,
						type: item.type,
						format: item.format,
						productionStage: item.productionStage,
						releaseDate: this.mongo.dateToBigInt(item.releaseDate),
						initialPlatform: item.initialPlatform,
						created: this.mongo.dateToBigInt(item.created),
						lastUpdated: this.mongo.dateToBigInt(item.lastUpdated),
						posterUrl: photo?.optimisedUrl,
						logline: item.logline,
						directors: directorNames,
						listRatings: item.listRatings,
						listScore: item.listScore
					}
				})
			)

			// People
			const peopleResults = await this.drillThrough<Person>('people')
			const people = await Promise.all(
				peopleResults.map(async (item): Promise<PersonSchema> => {
					const photo = await this.mongo.db.collection<Photo>('photos').findOne({
						parentCollection: 'people',
						parentId: item.id,
						type: 'image',
						photoIndex: 0
					})

					return {
						id: item.id,
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
						deathDate: this.mongo.dateToBigInt(item.deathDate),
						created: this.mongo.dateToBigInt(item.created),
						lastUpdated: this.mongo.dateToBigInt(item.lastUpdated),
						photoUrl: photo?.optimisedUrl,
						dateMonthOfBirth: this.mongo.dateToBigInt(item.dateMonthOfBirth)
					}
				})
			)

			// Companies
			const companiesResults = await this.drillThrough<Company>('companies');
			const companies = await Promise.all(
				companiesResults.map(async (item): Promise<CompanySchema> => {
					const photo = await this.mongo.db.collection<Photo>('photos').findOne({
						parentCollection: 'companies',
						parentId: item.id,
						type: 'image',
						photoIndex: 0
					})

					return {
						id: item.id,
						name: item.name,
						founder: item.founder,
						director: item.director,
						founded: item.founded,
						description: item.description,
						country: item.country,
						city: item.city,
						created: this.mongo.dateToBigInt(item.created),
						lastUpdated: this.mongo.dateToBigInt(item.lastUpdated),
						photoUrl: photo?.optimisedUrl
					}
				})
			)

			// Content
			const contentResults = await this.drillThrough<Content>('content');
			const content = await Promise.all(
				contentResults.map(async (item): Promise<ContentSchema> => {
					const photo = await this.mongo.db.collection<Photo>('photos').findOne({
						parentCollection: 'content',
						parentId: item.id,
						type: 'image',
						photoIndex: 0
					})

					return {
						id: item.id,
						authorName: item.authorName,
						authorId: item.authorId,
						headline: item.headline,
						slug: item.slug,
						created: this.mongo.dateToBigInt(item.created),
						lastUpdated:this.mongo.dateToBigInt(item.lastUpdated),
						photoUrl: photo?.optimisedUrl
					}
				})
			)

			// Users
			const usersResults = await this.drillThrough<UserExt>('users');
			const users = usersResults.map((item): UserSchema => {
				return {
					id: item.id,
					username: item.username,
					fullName: item.fullName,
					role: item.role,
					reputation: item.reputation,
					publication: item.publication,
					criticScore: item.criticScore,
					created: this.mongo.dateToBigInt(item.created),
					lastUpdated: this.mongo.dateToBigInt(item.lastUpdated)
				}
			})

			const filmsJSONlines = films.map((item) => JSON.stringify(item)).join('\n');
			const peopleJSONlines = people.map((item) => JSON.stringify(item)).join('\n');
			const companiesJSONlines = companies.map((item) => JSON.stringify(item)).join('\n');
			const contentJSONlines = content.map((item) => JSON.stringify(item)).join('\n');
			const usersJSONlines = users.map((item) => JSON.stringify(item)).join('\n');

			const filmsRes = await this.client.collections('films').documents().import(filmsJSONlines, {action: 'upsert'});
			const peopleRes = await this.client.collections('people').documents().import(peopleJSONlines, {action: 'upsert'});
			const companiesRes = await this.client.collections('companies').documents().import(companiesJSONlines, {action: 'upsert'});
			const contentRes = await this.client.collections('content').documents().import(contentJSONlines, {action: 'upsert'});
			const usersRes = await this.client.collections('users').documents().import(usersJSONlines, {action: 'upsert'});
			// console.log(filmsResults.length, peopleResults.length, contentResults.length, contentResults.length, usersResults.length)
			// console.log(filmsRes, peopleRes, companiesRes, contentRes, usersRes)
			// console.log('Does it log')
			return {status: 'success'}
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async drillThrough<T>(collection: Collection, limit?: number, page?: number): Promise<WithId<T>[]> {
		const	size = limit ? +limit : 500
		const skip = ( (page ? +page : 1) - 1 ) * size
		let documents: WithId<T>[] = []
		try {
			const total = await this.mongo.db.collection<T>(collection).estimatedDocumentCount()
			const totalPages = Math.ceil(total/size)
			const hasNext = (page ? +page : 1) < totalPages
			const results = await this.mongo.db.collection<T>(collection).find({}).sort({created: 1}).skip(skip).limit(size).toArray();
			documents = results
			
			if(hasNext === true){ 
				const nextPage = page ? ++page : 2;
				const nextResults = await this.drillThrough<T>(collection, 500, nextPage)
				documents = documents.concat(nextResults)
			}	
		} catch(err: any){
			throw new BadRequestException(err.message)
		}

		return documents
	}

}
