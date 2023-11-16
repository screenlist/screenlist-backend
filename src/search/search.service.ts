import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import Typesense from 'typesense'
import { StorageService } from '../storage/storage.service';
import * as moment from 'moment';

@Injectable()
export class SearchService {
	constructor(
		private config: ConfigService,
		private storage: StorageService
	){}

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
				{ 'name': 'type',	'type': 'string',	'facet': true },
				{ 'name': 'format',	'type': 'string',	'facet': true },
				{ 'name': 'productionStage',	'type': 'string',	'facet': true },
				{ 'name': 'releaseDate',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'listRatings',	'type': 'int32',	'facet': true, 'optional': true  },
				{ 'name': 'listScore',	'type': 'float',	'facet': true, 'optional': true  },
				{ 'name': 'posterUrl',	'type': 'string',	'facet': false, 'index': false, 'optional': true },
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
				{ 'name': 'created',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'lastUpdated',	'type': 'int64',	'facet': true, 'optional': true  },
				{ 'name': 'photoUrl',	'type': 'string',	'facet': false, 'index': false, 'optional': true }
			]
		}

		const userSchema = {
			'name': 'users',
			'fields': [
				{ 'name': 'id',	'type': 'string',	'facet': false },
				{ 'name': 'userName',	'type': 'string',	'facet': false },
				{ 'name': 'displayName',	'type': 'string',	'facet': false, 'optional': true  },
				{ 'name': 'bio',	'type': 'string',	'facet': false, 'optional': true  },
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
				{ 'name': 'author',	'type': 'string',	'facet': true },
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

}
