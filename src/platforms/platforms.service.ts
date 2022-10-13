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
		const {entity, history} = this.db.createPlatformEntity(data, opt);
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'created', 'platform_id': entity.key.id };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(data: UpdatePlatformDto, opt: PlatformOpt){
		const {entity, history} = this.db.updatePlatformEntity(data, opt);
		try{
			await this.db.update(entity);
			await this.db.insert(history);
			return { 'status': 'updated', 'platform_id': entity.key.id };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: PlatformOpt){
		const platformKey = this.db.key(['{Platform', +opt.platformId]);
		const entities = [{key: platformKey}]; // entites to be deleted
		const history = []; // actions to write into history
		const linksQuery = this.db.createQuery('{PlatformRole').hasAncestor(platformKey);
		try {
			const [links] = await this.db.runQuery(linksQuery);
			const [company] = await this.db.get(platformKey);
			const platformHistoryObj: HistoryOpt = {
				data: company,
				kind: 'Platform',
				id: platformKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			history.push(this.db.formulateHistory(platformHistoryObj));
			links.forEach((link) => {
				const linkKey = link[this.db.KEY];
				entities.push({key: linkKey});
				const linkHistoryObj: HistoryOpt = {
					data: link,
					kind: 'Link',
					id: linkKey.id,
					time: opt.time,
					action: 'delete',
					user: opt.user
				}
				history.push(this.db.formulateHistory(linkHistoryObj));
			})
			await this.db.transaction().delete(entities);
			await this.db.transaction().insert(history);
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
			const {entity, history} = this.db.updatePlatformEntity(dto, opt);
			await this.db.update(entity);
			await this.db.insert(history);
			return { 'status': 'created', 'image_url': entity.data.profilePhotoUrl }
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
			const {entity, history} = this.db.updatePlatformEntity(dto, opt);
			await this.storage.deletePoster(platform.profilePhotoOriginalName);
			await this.db.update(entity);
			await this.db.insert(history);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async createOneLink(data: CreateLinkDto, opt: LinkOpt){
		const {entity, history} = this.db.createLinkEntity(data, opt);
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'created', 'link_id': entity.key.id }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneLink(data: UpdateLinkDto, opt: LinkOpt){
		const {entity, history} = await this.db.updateLinkEntity(data, opt);
		try {
			await this.db.update(entity)
			await this.db.insert(history)
			return { 'status': 'updated', 'link_id': entity.key.id }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneLink(opt: LinkOpt){
		const linkKey = this.db.key(['Platform', +opt.platformId, opt.parentKind, +opt.parentId, 'Link', +opt.linkId]);
		try {
			const [link] = await this.db.get(linkKey);
			const historyObj: HistoryOpt = {
				data: link,
				kind: 'Link',
				id: linkKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			const history = this.db.formulateHistory(historyObj);
			const entity = {key: linkKey};
			await this.db.delete(entity);
			await this.db.insert(history);
			return { 'status': 'deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}
