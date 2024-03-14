import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { parseString, Parser } from 'xml2js'
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { HistoryOpt } from '../database/database.types';
import { StorageService } from '../storage/storage.service';
import { DatabaseService } from '../database/database.service';
import { SearchService } from 'src/search/search.service';
import { CreateContentDto, UpdateContentDto } from './content.dto';
import { Content, ContentOpt } from './content.types';
import {
	PhotoDto
} from '../films/films.dto';
import { ImageOpt, Photo } from '../films/films.types';
import { ContentSchema } from 'src/search/search.types.';

@Injectable()
export class ContentService {
	constructor(
		private storage: StorageService,
		private mongo: DatabaseService,
		private search: SearchService,
		private config: ConfigService
	){}

	async findOne(slug: string, type: 'blog'|'tos'|'about'|'contributions'|'privacy'){
		try {
			const results = await this.mongo.db.collection<Content>('content').findOne({
				type: type,
				slug: slug
			});

			if(!results){ throw new NotFoundException('Resource not found') };

			if(results.type != type){ throw new BadRequestException('Action not allowed') };
			
			return results
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createOne(data: CreateContentDto, opt: ContentOpt){
		data.slug = data.type == 'blog' ? data.headline.toLowerCase().concat(`-${new Date(opt.time).toISOString()}`).replace(/[^0-9a-z]/gi, '-') : data.type;
		try {
			if(data.type == 'blog'){
				const results = await this.mongo.db.collection<Content>('content').countDocuments({slug: data.slug});
				if(results > 0){
					throw new BadRequestException('Slug already exists')
				}
			}

			const entity: Content = {
				id: await this.mongo.generateUniqueId('content', 12),
				authorName: data.authorName,
				authorId: data.authorId,
				created: opt.time,
				lastUpdated: opt.time,
				slug: data.slug,
				type: data.type as Content['type'],
				headline: data.headline,
				body: data.body,
				tags: data.tags,
				summary: data.summary
			}

			await this.mongo.insertOne(entity, 'content')

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'content',
				id: entity.id,
				action: 'create',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			const searchRecord: ContentSchema = {
				id: entity.id,
				authorName: entity.authorName,
				headline: entity.headline,
				authorId: entity.authorId,
				slug: entity.slug,
				created: this.mongo.dateToBigInt(entity.created),
				lastUpdated:this.mongo.dateToBigInt(entity.lastUpdated)
			}
			
			await this.search.client.collections('content').documents().create(searchRecord);

			return entity
		} catch(err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateOne(
		data: UpdateContentDto, 
		opt: ContentOpt,
		slug: string, 
		type: 'blog'|'tos'|'about'|'contributions'|'privacy'
	){
		try {
			const results = await this.mongo.db.collection<Content>('content').findOne({type: type, slug: slug});

			if(!results){ throw new NotFoundException('Resource not found') };

			// Validate if the type of content being updated is
			// being done from the correct endpoint
			if(results.type != type){ throw new BadRequestException('Action not allowed') };

			const dataBefore = {...results};

			if(data.headline) {
				data.slug = results.type == 'blog' ? data.headline.toLowerCase().concat(`-${new Date(opt.time).toISOString()}`).replace(/[^0-9a-z]/gi, '-') : results.type;
			}

			if(results.type == 'blog'){
				// To avaoid duplicate slugs
				const results = await this.mongo.db.collection<Content>('content').countDocuments({type: 'blog', slug: data.slug})
				if(results > 0){
					throw new BadRequestException('Slug already exists')
				}
			}

			for (const key in data) {
				results[key] = data[key]
			}

			results.lastUpdated = opt.time

			const dataAfter = {...results};

			await this.mongo.updateOne(results, 'content');
			
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'content',
				id: results.id,
				action: 'update',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			const searchRecord: Partial<ContentSchema> = {
				authorName: results.authorName,
				headline: results.headline,
				authorId: results.authorId,
				slug: results.slug,
				lastUpdated: this.mongo.dateToBigInt(results.lastUpdated)
			}
			// await this.algolia.initIndex('content').partialUpdateObject(searchRecord).wait();
			await this.search.client.collections('content').documents(results.id).update(searchRecord);

			return results
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: ContentOpt, slug: string, type: 'blog'|'tos'|'about'|'contributions'|'privacy'){
		try {
			const results = await this.mongo.db.collection<Content>('content').findOne({type: type, slug: slug});

			if(!results){ throw new NotFoundException('Resource not found') };

			// Validate if the type of content being deleted is
			// being done from the correct endpoint
			if(results.type != type){ throw new BadRequestException('Action not allowed') };

			const historyObj: HistoryOpt = {
				dataObject: results,
				kind: 'content',
				id: results.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}

			await this.search.client.collections('content').documents(results.id).delete();
			await this.mongo.createHistory(historyObj);
			await this.mongo.db.collection<Content>('content').deleteOne({id: results.id});
			return { 'status': 'deleted' }
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			const data = await this.storage.uploadContentPhoto(image)
			const photo: Photo = { 
				...data, 
				id: await this.mongo.generateUniqueId('photos', 12),
				photoIndex: opt.index,
				lastUpdated: opt.time,
				created: opt.time,
				parentCollection: 'content',
				parentId: opt.parentId,
				type: 'image',
				uploadedByUser: opt.user
			}

			const existing = await this.mongo.db.collection<Photo>('photos').countDocuments({parentCollection: 'content', parentId: opt.parentId})

			if(existing > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}
			
			await this.mongo.insertOne(photo, 'photos');

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'photos',
				pKind: 'content',
				id: photo.id,
				pId: opt.parentId,
				action: 'create',
				time: opt.time,
			}

			await this.mongo.createHistory(historyObj);
			return photo
		} catch {
			throw new BadRequestException()
		}
	}

	async updatePhoto(data: PhotoDto , opt: ImageOpt){
		try {
			const entity = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'content',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			})

			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				entity[key] = data[key]
			}

			entity.lastUpdated = opt.time

			const dataAfter = {...entity};
			await this.mongo.updateOne(entity, 'photos');

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'photos',
				pKind: 'content',
				id: entity.id,
				pId: opt.parentId,
				action: 'update',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);
			return entity
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async removePhoto(opt: ImageOpt){
		try{
			const photo = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'content',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			})
			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'photos',
				pKind: 'content',
				id: photo.id,
				pId: opt.parentId,
				action: 'delete',
				time: opt.time,
			}
			await this.storage.deletePhoto(photo.originalName);
			await this.storage.deletePhoto(photo.optimisedName);
			await this.mongo.createHistory(historyObj);
			await this.mongo.db.collection<Photo>('photos').deleteOne({
				parentCollection: 'content',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			})
			return {'status': 'deleted'}
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async findBlogArticles(page?: number, limit?: number){
		const	size = limit ? +limit : 50
		const skip = ( (page ? +page : 1) - 1 ) * size

		const query = this.mongo.db.collection<Content>('content').find({type: 'blog'}).sort({created: -1}).skip(skip).limit(size)
		try { 
			return {
				data: await query.toArray(),
				hasNextPage: await query.hasNext()
			}
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createAbout(data: CreateContentDto, opt: ContentOpt){
		data.type = 'about';
		try {
			const article = await this.mongo.db.collection<Content>('content').countDocuments({type: 'about'})
			if(article > 0) { throw new BadRequestException('Action not allowed') };
			return await this.createOne(data, opt);
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createContributionsGuide(data: CreateContentDto, opt: ContentOpt){
		data.type = 'contributions';
		try {
			const article = await this.mongo.db.collection<Content>('content').countDocuments({type: 'contributions'})
			if(article > 0) { throw new BadRequestException('Action not allowed') };
			return await this.createOne(data, opt);
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createBlogArticle(data: CreateContentDto, opt: ContentOpt){
		data.type = 'blog';
		try {
			return await this.createOne(data, opt);
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createPrivacyPolicy(data: CreateContentDto, opt: ContentOpt){
		data.type = 'privacy';
		try {
			const article = await this.mongo.db.collection<Content>('content').countDocuments({type: data.type})
			if(article > 0) { throw new BadRequestException('Action not allowed') };
			return await this.createOne(data, opt);
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createTermsOfService(data: CreateContentDto, opt: ContentOpt){
		data.type = 'tos';
		try {
			const article = await this.mongo.db.collection<Content>('content').countDocuments({type: data.type})
			if(article > 0) { throw new BadRequestException('Action not allowed') };
			return await this.createOne(data, opt);
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async getEpisodes(){
		const url = 'https://anchor.fm/s/e693c3d0/podcast/rss';
		try {
			const xml = await axios.get(url);
			// console.log(xml.data)
			const parser = new Parser()
			const data = await  parser.parseStringPromise(xml.data)
			const episodes = data.rss.channel[0].item.slice(0, 10).map((item: any) => {
				return {
					title: item.title[0],
					url: item.enclosure[0].$.url,
					audioType: item.enclosure[0].$.type,
					date: item.pubDate[0],
					duration: item['itunes:duration'][0]
				}
			})
			// console.log(episodes)
			return episodes
		} catch (err: any){
			throw new NotFoundException()
		}
	}
}
