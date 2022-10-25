import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import Typesense from 'typesense';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SearchService {
	constructor(
		private configService: ConfigService,
		private db: DatabaseService
	){}

	// TODO: integrate typesense
	private client = new Typesense.Client({
		nodes: [{
			host: this.configService.get('SEARCH_HOST'),
			port: 443,
			protocol: 'https'
		}],
		apiKey: this.configService.get('SEARCH_API'),
		connectionTimeoutSeconds: 2
	})


	async quickSearch(queryName: 'film'|'series'|'person'|'company'|'platform', name: string){
		if(queryName == 'film'){
			return await this.quickFilms(name)
		} else if (queryName == 'series'){
			return await this.quickSeries(name)
		} else if(queryName == 'person'){
			return await this.quickPeople(name)
		} else if(queryName == 'company'){
			return await this.quickCompanies(name)
		} else if(queryName == 'platform'){
			return await this.quickPlatforms(name)
		}
	}

	async quickFilms(name: string){
		const query = this.db.createQuery('Film')
													.filter('name', '=', name)
													.order('name')
													.limit(5);
		try{
			const [result] = await this.db.runQuery(query)
			return result
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async quickSeries(name: string){
		const query = this.db.createQuery('Series')
													.filter('name', '=', name)
													.order('name')
													.limit(5);
		try{
			const [result] = await this.db.runQuery(query)
			return result
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async quickCompanies(name: string){
		const query = this.db.createQuery('Company')
													.filter('name', '=', name)
													.order('name')
													.limit(5);
		try{
			const [result] = await this.db.runQuery(query)
			return result
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async quickPeople(name: string){
		const query = this.db.createQuery('Person')
													.filter('name', '=', name)
													.order('name')
													.limit(5);
		try{
			const [result] = await this.db.runQuery(query)
			return result
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async quickPlatforms(name: string){
		const query = this.db.createQuery('Platform')
													.filter('name', '=', name)
													.order('name')
													.limit(5);
		try{
			const [result] = await this.db.runQuery(query)
			return result
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

}
