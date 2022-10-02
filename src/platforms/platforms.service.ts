import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class PlatformsService {
	constructor(
		private configService: ConfigService,
		private db: DatabaseService
	){
		this.db = new DatabaseService(configService)
	}

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
			return { 'status': 'successfully created' };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(data: UpdatePlatformDto, opt: PlatformOpt){
		const {entity, history} = this.db.updatePlatformEntity(data, opt);
		try{
			await this.db.update(entity);
			await this.db.insert(history);
			return { 'status': 'successfully updated' };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(id: string, user:string){
		const platformKey = this.db.key(['{Platform', +id]);
		const entities = [{key: platformKey}]; // entites to be deleted
		const history = []; // actions to write into history
		const linksQuery = this.db.createQuery('{PlatformRole').hasAncestor(platformKey);
		try {
			const [links] = await this.db.runQuery(linksQuery);
			const [company] = await this.db.get(platformKey);
			history.push(this.db.formulateHistory(company, '{Platform', platformKey.id, user, 'delete'));
			links.forEach((link) => {
				const linkKey = link[this.db.KEY];
				entities.push({key: linkKey});
				history.push(this.db.formulateHistory(link, '{PlatformRole', linkKey.id, user, 'delete'));
			})
			await this.db.transaction().delete(entities);
			await this.db.transaction().insert(history);
			return { 'status': 'successfully deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async createOneLink(data: CreateLinkDto, opt: LinkOpt){
		const {entity, history} = this.db.createLinkEntity(data, opt);
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'successfully created' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneLink(data: UpdateLinkDto, opt: LinkOpt){
		const {entity, history} = await this.db.updateLinkEntity(data, opt);
		try {
			await this.db.update(entity)
			await this.db.insert(history)
			return { 'status': 'successfully updated' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneLink(opt: LinkOpt){
		const linkKey = this.db.key(['Platform', +opt.platformId, opt.parentKind, +opt.parentId, 'Link', +opt.linkId]);
		try {
			const [link] = await this.db.get(linkKey);
			const history = this.db.formulateHistory(link, 'PlatformRole', linkKey.id, opt.user, 'delete');
			const entity = {key: linkKey};
			await this.db.delete(entity);
			await this.db.insert(history);
			return { 'status': 'successfully deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}
