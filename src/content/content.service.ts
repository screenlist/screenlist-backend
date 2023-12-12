import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { parseString, Parser } from 'xml2js'
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import {createClient, type ClientConfig} from '@sanity/client'
import { HistoryOpt } from '../database/database.types';
import { StorageService } from '../storage/storage.service';
import { DatabaseService } from '../database/database.service';
import { SearchService } from 'src/search/search.service';
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
		private db: DatabaseService,
		private search: SearchService,
		private config: ConfigService
	){}

	private sanity = createClient({
		projectId: this.config.get('SANITY_PROJECT'),
		dataset: this.config.get('SANITY_DATASET'),
		useCdn: true,
		apiVersion: '2023-05-03',
		perspective: 'published',
	})

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

			await this.search.client.collections('content').documents(article[this.db.KEY]['id']).delete();
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
		const query = this.db.createQuery('Content').filter('type', '=', 'contributions');
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

	async getEpisodes(){
		const url = 'https://anchor.fm/s/e693c3d0/podcast/rss';
		try {
			const xml = await axios.get(url);
			// console.log(xml.data)
			const parser = new Parser()
			const data = await  parser.parseStringPromise(xml.data)
			const episodes = data.rss.channel[0].item.slice(0, 10).map((item) => {
				return {
					title: item.title[0],
					url: item.enclosure[0].$.url,
					audioType: item.enclosure[0].$.type,
					date: item.pubDate[0],
					duration: item['itunes:duration'][0]
				}
			})
			console.log(episodes)
			return episodes
		} catch (err: any){
			throw new NotFoundException()
		}
	}

	// Marginal Content

	async getArticles(page: number, userUid?: string){
		const now = new Date().toISOString();
		const firstIndex = page > 0 ? page*10 : 0;
		const lastIndex = firstIndex+10;
		const filter = `_type=="article"`
		try {	
			if(userUid){
				const [user] = await this.db.get(this.db.key(['User', userUid]));
				if(user.role === "member"){
					filter.concat(` && publishAt < ${now}`)
				}
			}	else {
				filter.concat(` && publishAt < ${now}`)
			}

			const articles = await this.sanity.fetch(`*[${filter}][${firstIndex}..${lastIndex}] | order(publishAt desc) {
				heading, "slug": slug.current, summary,
				"author": {
					"name": authorReference->name,
					"image": authorReference->image.asset->url,
					"slug": authorReference->slug.current
				},
				"image": image.asset->url,
				publishAt,
				"updatedAt": _updatedAt,
				tags
			}`)
			
			return {
				data: articles,
				meta: {
					more: articles.length > 10 ? true : false,
					nextPage: articles.length > 10 ? page++ : page
				}
			}
		} catch(err: any) {
			// console.log(err)
			throw new NotFoundException(err.message)
		}
	}

	async getArticle(slug: string, userUid?: string){
		try {			
			const data = await this.sanity.fetch(`*[_type=="article" && slug.current=="${slug}"] {
				heading, "slug": slug.current, summary,
				"author": {
					"name": authorReference->name,
					"image": authorReference->image.asset->url,
					"slug": authorReference->slug.current
				},
				"image": image.asset->url,
				publishAt,
				"updatedAt": _updatedAt,
				tags, preview, body, "id": _id
			}`)

			if(data.length === 0){ throw new NotFoundException() }
			const article = data[0];

			const now = Date.now()
			const pubDate = Number(new Date(article.publishAt))

			if(userUid){
				const [user] = await this.db.get(this.db.key(['User', userUid]));
				const [subscription] = await this.db.get(this.db.key(['Subscription', userUid]));
				const [products] = await this.db.createQuery('Product').filter('user', '=', userUid).filter('type', '=', 'article').filter('verified', '=', true).filter('articleId', '=', article.id).run();
				
				if(user.role === "member" && pubDate > now) {
					throw new NotFoundException()
				} if(user.role === "admin" || user.role === "curator" || user.role === "moderator") {
					return article
				} else if(products.length > 0){
					return article
				} else if(subscription){
					if(subscription.status === 'active'){
						return article
					} else {
						delete article.body;
						return article;
					}
				} else {
					delete article.body;
					return article
				}
			} if(pubDate > now) {
				throw new NotFoundException()
			} else {
				delete article.body;
				return article
			}
		} catch(err: any) {
			// console.log(err)
			throw new NotFoundException(err.message)
		}
	}

	async getBoughtArticles(userUid: string){
		const now = new Date().toISOString();
		const filter = `_type=="article"`
		try {
			const [user] = await this.db.get(this.db.key(['User', userUid]));
			if(user.role === "member"){
				filter.concat(` && publishAt < ${now}`)
			}

			const [products] = await this.db.createQuery('Product').filter('user', '=', userUid).filter('type', '=', 'article').filter('verified', '=', true).run();
			const articles = await Promise.all(
				products.map(async (item) => {
					const results = await this.sanity.fetch(`*[${filter} && _id==${item.articleId}] | order(publishAt desc) {
						heading, "slug": slug.current, summary,
						"author": {
							"name": authorReference->name,
							"image": authorReference->image.asset->url,
							"slug": authorReference->slug.current
						},
						"image": image.asset->url,
						publishAt,
						"updatedAt": _updatedAt,
						tags
					}`)

					if(results.length > 0){
						return results[0]
					}
				})
			)

			return articles.sort((a, b) => {
				if(Number(new Date(a.publishAt)) > Number(new Date(b.publishAt))) {
					return -1
				} else if (Number(new Date(a.publishAt)) < Number(new Date(b.publishAt))) {
					return 1;
				} else {
					return 0
				}
			})
		} catch (err: any){
			throw new NotFoundException()
		}
	}

	async getNewsletters(page: number, userUid?: string){
		const now = new Date().toISOString();
		const firstIndex = page > 0 ? page*10 : 0;
		const lastIndex = firstIndex+10;
		const filter = `_type=="newsletter"`
		try {
			if(userUid){
				const [user] = await this.db.get(this.db.key(['User', userUid]));
				if(user.role === "member"){
					filter.concat(` && publishAt < ${now}`)
				}
			}	else {
				filter.concat(` && publishAt < ${now}`)
			}

			const articles = await this.sanity.fetch(`*[${filter}][${firstIndex}..${lastIndex}] | order(publishAt desc) {
				heading, "slug": slug.current, summary,
				"author": {
					"name": authorReference->name,
					"image": authorReference->image.asset->url,
					"slug": authorReference->slug.current
				},
				"image": image.asset->url,
				publishAt,
				"updatedAt": _updatedAt,
				tags
			}`)

			return {
				data: articles,
				meta: {
					more: articles.length > 10 ? true : false,
					nextPage: articles.length > 10 ? page++ : page
				}
			}
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async getNewsletter(slug: string, userUid?: string){
		try {			
			const data = await this.sanity.fetch(`*[_type=="newsletter" && slug.current=="${slug}"] {
				heading, "slug": slug.current, summary,
				"author": {
					"name": authorReference->name,
					"image": authorReference->image.asset->url,
					"slug": authorReference->slug.current
				},
				"image": image.asset->url,
				publishAt,
				"updatedAt": _updatedAt,
				tags, preview, body, "id": _id
			}`)

			if(data.length === 0){ throw new NotFoundException() }
			const article = data[0];

			const now = Date.now()
			const pubDate = Number(new Date(article.publishAt))
			if(now > pubDate){
				return article
			}

			if(userUid){
				const [user] = await this.db.get(this.db.key(['User', userUid]));
				const [subscription] = await this.db.get(this.db.key(['Subscription', userUid]));
				if(user.role === "admin" || user.role === "curator" || user.role === "moderator") {
					return article
				} else if(subscription){
					if(subscription.status === 'active'){
						return article
					} else {
						delete article.body;
						return article;
					}
				} else {
					delete article.body;
					return article
				}
			} else {
				delete article.body;
				return article
			}
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async getAuthors(page: number, userUid?: string){
		const now = new Date().toISOString();
		const firstIndex = page > 0 ? page*10 : 0;
		const lastIndex = firstIndex+10;
		const filter = `_type=="author"`
		try {
			if(userUid){
				const [user] = await this.db.get(this.db.key(['User', userUid]));
				if(user.role === "member"){
					filter.concat(` && publishAt < ${now}`)
				}
			}	else {
				filter.concat(` && publishAt < ${now}`)
			}

			const authors = await this.sanity.fetch(`
				*[${filter}][${firstIndex}..${lastIndex}] | order(name) {
					"id": _id, publishAt, "updatedAt": _updatedAt,
					name, "slug": slug.current, instagram, twitter,
					shortBio, "image": image.asset->url,
					biography, occupation
				}
			`)
			
			return {
				data: authors,
				meta: {
					more: authors.length > 10 ? true : false,
					nextPage: authors.length > 10 ? page++ : page
				}
			}
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async getAuthor(slug: string){
		try {
			const data = await this.sanity.fetch(`
				*[_type=="author" && slug.current=="${slug}"] {
					"id": _id, publishAt, "updatedAt": _updatedAt,
					name, "slug": slug.current, instagram, twitter,
					shortBio, "image": image.asset->url,
					biography, occupation
				}
			`)
			if(data.length === 0){ throw new NotFoundException() }
			return data[0];
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async getPodcasts(page: number, userUid?: string){
		const now = new Date().toISOString();
		const firstIndex = page > 0 ? page*10 : 0;
		const lastIndex = firstIndex+10;
		const filter = `_type=="podcast"`
		try {
			if(userUid){
				const [user] = await this.db.get(this.db.key(['User', userUid]));
				if(user.role === "member"){
					filter.concat(` && publishAt < ${now}`)
				}
			}	else {
				filter.concat(` && publishAt < ${now}`)
			}

			const podcasts = await this.sanity.fetch(`
				*[${filter}][${firstIndex}..${lastIndex}] | order(publishAt desc) {
					summary, heading, publishAt,
					"updatedAt": _updatedAt, "image": image.asset->url,
					"slug": slug.current, tags, spotifyUrl, body
				}
			`)

			return {
				data: podcasts,
				meta: {
					more: podcasts.length > 10 ? true : false,
					nextPage: podcasts.length > 10 ? page++ : page
				}
			}
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async getPodcast(slug: string){
		try {
			const data = await this.sanity.fetch(`
				*[_type=="podcast" && slug.current=="${slug}"]{
					summary, heading, publishAt,
					"updatedAt": _updatedAt, "image": image.asset->url,
					"slug": slug.current, tags, spotifyUrl, body
				}
			`)
			if(data.length === 0){ throw new NotFoundException() }		
			const article = data[0];
			
			const now = Date.now()
			const pubDate = Number(new Date(article.publishAt))
			if(now > pubDate){
				return article
			} else {
				throw new NotFoundException()
			}
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async getAbout(){
		try {
			const data: any[] = await this.sanity.fetch(`
				*[_type=="about"] | order(_createdAt){
					"updatedAt": _updatedAt, "slug": slug.current,
					"image": image.asset->url, publishAt,
					body, summary, heading, "id":_id
				}
			`)
			if(data.length === 0){ throw new NotFoundException() }
			const focus = data.find((val) => val.slug === "focus");
			const datas = data.find((val) => val.slug === "data");
			const about = data.find((val) => val.slug === "about");
			
			return {
				focus, methods: datas, about
			};
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}
}
