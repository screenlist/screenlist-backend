import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
	CreatePlatformDto,
	UpdatePlatformDto,
	CreateLinkDto,
	UpdateLinkDto
} from './platforms.dto';
import {
	Platform,
	Link,
	PlatformOpt,
	LinkOpt
} from './platforms.types';
import { HistoryOpt } from '../database/database.types';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PlatformsService {
	constructor(
		private storage: StorageService,
		private db: DatabaseService
	){}

	async findAll(): Promise<Platform[]>{
		const query =  this.db.createQuery('Platform').order('name').limit(100);
		try {
			const [platform] = await this.db.runQuery(query)
			return platform
		} catch {
			throw new NotFoundException('Could not find platforms');
		}
	}

	async findOne(id: string): Promise<Platform> {
		const platformKey = this.db.key(['Platform', +id]);
		try {
			const [platform] = await this.db.get(platformKey);
			return platform
		} catch {
			throw new NotFoundException("Platform not found");
		}
	}

	async createOne(data: CreatePlatformDto, opt: PlatformOpt){
		try{
			const {entity, history} = await this.db.createPlatformEntity(data, opt);
			return { 'status': 'created', 'platform_id': entity.key.id };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(data: UpdatePlatformDto, opt: PlatformOpt){
		const {entity, history} = await this.db.updatePlatformEntity(data, opt);
		try{
			await this.db.upsert([entity, history]);
			return { 'status': 'updated', 'platform_id': entity[this.db.KEY]['id'] };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: PlatformOpt){
		const platformKey = this.db.key(['{Platform', +opt.platformId]);
		const entities = [{key: platformKey}]; // entites to be deleted
		const linksQuery = this.db.createQuery('{PlatformRole').hasAncestor(platformKey);
		try {
			const [links] = await this.db.runQuery(linksQuery);
			const [company] = await this.db.get(platformKey);
			const platformHistoryObj: HistoryOpt = {
				dataObject: company,
				kind: 'Platform',
				id: platformKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			await this.db.creaateHistory(platformHistoryObj);
			links.forEach(async (link) => {
				const linkKey = link[this.db.KEY];
				entities.push({key: linkKey});
				const linkHistoryObj: HistoryOpt = {
					dataObject: link,
					kind: 'Link',
					id: linkKey.id,
					time: opt.time,
					action: 'delete',
					user: opt.user
				}
				await this.db.createHistory(linkHistoryObj);
			})
			await this.db.transaction().delete(entities);
			return { 'status': 'deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: PlatformOpt, image: Express.Multer.File){
		try {
			const file = await this.storage.uploadProfilePhoto(image)
			const dto: UpdatePlatformDto = {
				profilePhotoUrl: file.url,
				profilePhotoOriginalName: file.originalName
			}
			const {entity, history} = await this.db.updatePlatformEntity(dto, opt);
			return { 'status': 'created', 'image_url': entity.profilePhotoUrl }
		} catch {
			throw new BadRequestException()
		}
	}

	async removePhoto(opt: PlatformOpt){
		try{
			const platformKey = this.db.key(['Company', +opt.platformId]);
			const [result] = await this.db.get(platformKey);
			const platform: Platform = result 
			const dto: UpdatePlatformDto = {
				profilePhotoUrl: null,
				profilePhotoOriginalName: null
			}
			const {entity, history} = await this.db.updatePlatformEntity(dto, opt);
			await this.storage.deletePoster(platform.profilePhotoOriginalName);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async createOneLink(data: CreateLinkDto, opt: LinkOpt){
		try {
			const {entity, history} = await this.db.createLinkEntity(data, opt);
			return { 'status': 'created', 'link_id': entity[this.db.KEY]['id'] }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneLink(data: UpdateLinkDto, opt: LinkOpt){
		try {
			const {entity, history} = await this.db.updateLinkEntity(data, opt);
			return { 'status': 'updated', 'link_id': entity[this.db.KEY]['id'] }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneLink(opt: LinkOpt){
		const linkKey = this.db.key(['Platform', +opt.platformId, opt.parentKind, +opt.parentId, 'Link', +opt.linkId]);
		try {
			const [link] = await this.db.get(linkKey);
			const historyObj: HistoryOpt = {
				dataObject: link,
				kind: 'Link',
				id: linkKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			await this.db.createHistory(historyObj);
			const entity = {key: linkKey};
			await this.db.delete(entity);
			return { 'status': 'deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}
