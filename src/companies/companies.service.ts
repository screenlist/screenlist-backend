import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto,
	CreateCompanyDto,
	UpdateCompanyDto
} from './companies.dto';
import {
	Company,
	CompanyRole,
	CompanyType,
	CompanyOpt,
	CompanyRoleOpt
} from './companies.types';
import { CreateDisplayPhotoDto, UpdateDisplayPhotoDto } from '../films/films.dto';
import { ImageOpt } from  '../films/films.types';
import { HistoryOpt } from '../database/database.types';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CompaniesService {
	constructor(
		private storage: StorageService,
		private db: DatabaseService
	){}

	async findAll(): Promise<Company[]>{
		const query = this.db.createQuery('Company').order('name').limit(100);
		try{
			let [companies] = await this.db.runQuery(query);
			companies = await Promise.all(
				companies.map(async (item) => {
					const photoKey = this.db.key(['Company', +item[this.db.KEY]['id'], 'CompanyPhoto', '0']);
					const [photo] = await this.db.get(photoKey);
					item.id = item[this.db.KEY]['id'];
					item.photo = photo ? {
						url: photo?.sdUrl,
						id: photo[this.db.KEY]['name'],
						credit: photo?.attribution,
						altText: photo?.description
					} : null

					return item
				})
			);
			return companies
		} catch {
			throw new NotFoundException('Could not retrieve companies');
		}
	}

	async findOne(id: string): Promise<any>{
		const companyKey = this.db.key(['Company', +id]);
		const photoKey = this.db.key(['Company', +id, 'CompanyPhoto', '0']);
		const rolesQuery = this.db.createQuery('CompanyRole').filter('companyId', '=', id)

		try {
			const [details] = await this.db.get(companyKey);
			const [photo] = await this.db.get(photoKey);
			details.id = details[this.db.KEY]['id'];
			details.photo = photo ? {
				url: photo?.sdUrl,
				id: photo[this.db.KEY]['name'],
				credit: photo?.attribution,
				altText: photo?.description
			} : null;

			let [roles] = await this.db.runQuery(rolesQuery);

			roles = await Promise.all(
				roles.map(async (item) => {
					const parentKey = this.db.key([item.ownerKind, +item.ownerId]);
					const posterKey = this.db.key([item.ownerKind, +item.ownerId, 'Poster', '0']);

					try {

						const [parent] = await this.db.get(parentKey);
						const [poster] = await this.db.get(posterKey);

						const path = `/${item.ownerKind == 'Film' ? 'films' : 'series'}/${item.ownerId}/companies/${item.companyId}/roles/${item[this.db.KEY]['id']}`;
						return {
							id: item[this.db.KEY]['id'],
							...item,
							ownerName: parent.name,
							posterUrl: poster?.lqUrl,
							year: parent.year,
							urlPath: path
						}
					} catch(err: any) {
						throw new BadRequestException(err.message)
					}
				})
			)

			const productions = roles.filter((value) => value.type == 'production').sort((a, b) => {
				if(a.year > b.year) {
					return -1
				} else {
					return 0
				}
			});

			const distributions = roles.filter((value) => value.type == 'distribution').sort((a, b) => {
				if(a.year > b.year) {
					return -1
				} else {
					return 0
				}
			});

			return {
				details,
				productions,
				distributions
			}
		} catch{
			throw new NotFoundException('Company not found')
		}
	}

	async createOne(data: CreateCompanyDto, opt: CompanyOpt){
		try {
			const {entity, history} = await this.db.createCompanyEntity(data, opt);
			return { id: entity.key.id, ...entity.data };
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updateOne(data: UpdateCompanyDto, opt: CompanyOpt){
		try {
			const {entity, history} = await this.db.updateCompanyEntity(data, opt);
			return { id: entity[this.db.KEY]['id'], ...entity }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(opt: CompanyOpt){
		const companyKey = this.db.key(['Company', +opt.companyId]);
		const entities = [{key: companyKey}]; // entites to be deleted
		const rolesQuery = this.db.createQuery('CompanyRole').hasAncestor(companyKey);
		try {
			const [roles] = await this.db.runQuery(rolesQuery);
			const [company] = await this.db.get(companyKey);
			const historyObj: HistoryOpt = {
				dataObject: company,
				kind: 'Company',
				id: companyKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			await this.db.createHistory(historyObj);
			roles.forEach(async (role) => {
				const roleKey = role[this.db.KEY];
				entities.push({key: roleKey});
				const roleHistoryObj: HistoryOpt = {
					dataObject: role,
					kind: 'CompanyRole',
					id: roleKey.id,
					time: opt.time,
					action: 'delete',
					user: opt.user
				}
				await this.db.createHistory(roleHistoryObj);
			})
			await this.db.algolia.initIndex('companies').deleteObject(companyKey.id);
			await this.db.delete(entities);
			return { 'status': 'deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			const data = await this.storage.uploadProfilePhoto(image)
			const dto: CreateDisplayPhotoDto = { ...data }

			const {entity, history} = await this.db.createCompanyPhotoEntity(dto, opt);
			return { id: entity.key.name, ...entity.data }
		} catch {
			throw new BadRequestException()
		}
	}

	async updatePhoto(data: UpdateDisplayPhotoDto , opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updateCompanyPhotoEntity(data, opt);
			return { id: entity[this.db.KEY]['id'], ...entity }
		} catch {
			throw new BadRequestException()
		}
	}

	async removePhoto(opt: ImageOpt){
		try{
			const photoKey = this.db.key([opt.parentKind, +opt.parentId, 'CompanyPhoto', opt.imageId]);
			const [photo] = await this.db.get(photoKey);
			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'CompanyPhoto',
				id: photoKey.id,
				action: 'delete',
				time: opt.time,
			}
			await this.storage.deleteProfilePhoto(photo.originalName);
			await this.storage.deleteProfilePhoto(photo.hdName);
			await this.storage.deleteProfilePhoto(photo.sdName);
			await this.db.createHistory(historyObj);
			await this.db.delete(photoKey)
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async createOneRole(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		if(!data.type){
			throw new BadRequestException('role type not specified')
		}
		try {
			const {entity, history} = await this.db.createCompanyRoleEntity(data, opt);
			return { id: entity.key.id, ...entity.data }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		try {
			const entityData = await this.db.updateCompanyRoleEntity(data, opt);
			return { id: entityData.entity[this.db.KEY]['id'], ...entityData.entity }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneRole(opt: CompanyRoleOpt){
		const roleKey = this.db.key([
			'Company', 
			+opt.companyId, 
			opt.parentKind, 
			+opt.parentId, 
			'CompanyRole', 
			+opt.roleId
		]);
		try {
			const [role] = await this.db.get(roleKey);
			const historyObj: HistoryOpt = {
				dataObject: role,
				kind: 'CompanyRole',
				id: roleKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			
			const entity = {key: roleKey};
			await this.db.delete(entity);
			await this.db.createHistory(historyObj);
			return { 'status': 'deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}