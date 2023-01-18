import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HistoryOpt } from '../database/database.types';
import { StorageService } from '../storage/storage.service';
import { DatabaseService } from '../database/database.service';
import { CreateContentDto, UpdateContentDto } from './content.dto';
import { ContentOpt } from './content.types';
import {
	CreateContentPhotoDto,
	UpdateContentPhotoDto
} from '../films/films.dto';
import { ImageOpt } from '../films/films.types';

@Injectable()
export class ContentService {
	constructor(
		private storage: StorageService,
		private db: DatabaseService
	){}

	async findOne(slug: string, type: 'blog'|'tos'|'about'|'contributions'|'privacy'){
		const query = this.db.createQuery('Content').filter('type', '=', type).filter('slug', '=', slug).limit(1);
		try {
			const [results] = await this.db.runQuery(query);

			if(results.length < 1){ throw new NotFoundException('Resource not found') };

			const content = results[0]; 

			// Validate if the type of content being accessed is
			// being done from the correct endpoint
			if(content.type != type){ throw new BadRequestException('Action not allowed') };
			
			return {
				id: content[this.db.KEY]['id'],
				...content
			}
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async updateOne(
		data: UpdateContentDto, 
		opt: ContentOpt,
		slug: string, 
		type: 'blog'|'tos'|'about'|'contributions'|'privacy'
	){
		const query = this.db.createQuery('Content').filter('type', '=', type).filter('slug', '=', slug).limit(1);
		try {
			const [results] = await this.db.runQuery(query);

			if(results.length < 1){ throw new NotFoundException('Resource not found') };

			const content = results[0]; 

			// Validate if the type of content being updated is
			// being done from the correct endpoint
			if(content.type != type){ throw new BadRequestException('Action not allowed') };

			opt.contentId = content[this.db.KEY]['id'];

			const { entity } = await this.db.updateContentEntity(data, opt, content);
			return { id: entity[this.db.KEY]['id'], ...entity }
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: ContentOpt, slug: string, type: 'blog'|'tos'|'about'|'contributions'|'privacy'){
		const query = this.db.createQuery('Content').filter('type', '=', type).filter('slug', '=', slug).limit(1);
		try {
			const [results] = await this.db.runQuery(query);

			if(results.length < 1){ throw new NotFoundException('Resource not found') };

			const article = results[0];

			// Validate if the type of content being deleted is
			// being done from the correct endpoint
			if(article.type != type){ throw new BadRequestException('Action not allowed') };

			const historyObj: HistoryOpt = {
				dataObject: article,
				kind: 'Content',
				id: article[this.db.KEY]['id'],
				time: opt.time,
				action: 'delete',
				user: opt.user
			}

			await this.db.createHistory(historyObj);
			await this.db.delete(article[this.db.KEY]['id']);
			return { 'status': 'deleted' }
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			const data = await this.storage.uploadContentPhoto(image)
			const dto: CreateContentPhotoDto = { ...data }
			const {entity, history} = await this.db.createContentPhotoEntity(dto, opt);
			return { id: entity.key.name, ...entity.data }
		} catch {
			throw new BadRequestException()
		}
	}

	async updatePhoto(data: UpdateContentPhotoDto , opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updateContentPhotoEntity(data, opt);
			return { id: entity[this.db.KEY]['id'], ...entity }
		} catch {
			throw new BadRequestException()
		}
	}

	async removePhoto(opt: ImageOpt){
		try{
			const photoKey = this.db.key([opt.parentKind, +opt.parentId, 'ContentPhoto', opt.imageId]);
			const [photo] = await this.db.get(photoKey);
			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'ContentPhoto',
				id: photoKey.id,
				action: 'delete',
				time: opt.time,
			}
			await this.storage.deleteStill(photo.originalName);
			await this.storage.deleteStill(photo.hdName);
			await this.storage.deleteStill(photo.sdName);
			await this.db.createHistory(historyObj);
			await this.db.delete(photoKey)
			return {'status': 'deleted'}
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async findBlogArticles(){
		const query = this.db.createQuery('Content').filter('type', '=', 'blog')
		try {
			const [blog] = await this.db.runQuery(query);
			const results = await Promise.all(blog.map((article) => {
				return {
					id: article[this.db.KEY]['id'],
					...article
				}
			}))
			return results
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createAbout(data: CreateContentDto, opt: ContentOpt){
		data.type = 'about';
		const query = this.db.createQuery('Content').filter('type', '=', 'about');
		try {
			const [article] = await this.db.runQuery(query);
			if(article.length > 0) { throw new BadRequestException('Action not allowed') };
			const {entity} = await this.db.createContentEntity(data, opt);
			return { id: entity.key.id, ...entity.data };
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createContributionsGuide(data: CreateContentDto, opt: ContentOpt){
		data.type = 'contributions';
		const query = this.db.createQuery('Content').filter('type', '=', 'contributionsGuide');
		try {
			const [article] = await this.db.runQuery(query);
			if(article.length > 0) { throw new BadRequestException('Action not allowed') };
			const {entity} = await this.db.createContentEntity(data, opt);
			return { id: entity.key.id, ...entity.data };
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createBlogArticle(data: CreateContentDto, opt: ContentOpt){
		data.type = 'blog';
		try {
			const {entity} = await this.db.createContentEntity(data, opt);
			return { id: entity.key.id, ...entity.data };
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createPrivacyPolicy(data: CreateContentDto, opt: ContentOpt){
		data.type = 'privacy';
		const query = this.db.createQuery('Content').filter('type', '=', 'privacy');
		try {
			const [article] = await this.db.runQuery(query);
			if(article.length > 0) { throw new BadRequestException('Action not allowed') };
			const {entity} = await this.db.createContentEntity(data, opt);
			return { id: entity.key.id, ...entity.data };
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async createTermsOfService(data: CreateContentDto, opt: ContentOpt){
		data.type = 'tos';
		const query = this.db.createQuery('Content').filter('type', '=', 'tos');
		try {
			const [article] = await this.db.runQuery(query);
			if(article.length > 0) { throw new BadRequestException('Action not allowed') };
			const {entity} = await this.db.createContentEntity(data, opt);
			return { id: entity.key.id, ...entity.data };
		} catch (err: any) {
			throw new BadRequestException(err.message);
		}
	}
}
