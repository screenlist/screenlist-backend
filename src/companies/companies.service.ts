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
import { CreateDisplayPhotoDto, UpdateDisplayPhotoDto, UpdateFilmDto } from '../films/films.dto';
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
		const query = this.db.createQuery('Company').filter('editVerified', '=', true).order('lastUpdated', {descending: true}).limit(100);
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
		} catch(err: any) {
			throw new NotFoundException('Could not retrieve companies');
		}
	}

	async findAllUnverified() {
		const query = this.db.createQuery('Company').filter('editVerified', '=', false).limit(100);
		try{
			let [companies] = await this.db.runQuery(query);

			companies = await Promise.all(
				companies.map((item) => {
					item.id = item[this.db.KEY]['id'];
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

			const productions = []

			const productionUnsorted = roles.filter((value) => value.type == 'production').sort((a, b) => {
				if(a.year > b.year) {
					return -1
				} else {
					return 0
				}
			});

			productionUnsorted.forEach((item) => {
				const film = productions.find((val) => val.ownerId === item.ownerId)
				const capacity = item.capacity ? [{
					companyId: item.companyId,
					capacity: item.capacity,
					urlPath: item.urlPath,
					id: item.id
				}] : []

				if(film){
					productions[film].roles.push(...capacity)
				} else {
					productions.push({
						...item,
						roles: capacity
					})
				}
			})

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
		} catch(err: any){
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
			if(opt.imageId !== '0'){ throw new BadRequestException('Unknown index') }
			const data = await this.storage.uploadCompanyLogo(image)
			const dto: CreateDisplayPhotoDto = { ...data }

			const {entity, history} = await this.db.createCompanyPhotoEntity(dto, opt);
			return { id: entity.key.name, ...entity.data }
		} catch(err: any) {
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
		const company: UpdateCompanyDto = {
			editVerified: false
		}
		const companyOptions: CompanyOpt = {
			time: opt.time,
			user: opt.user,
			companyId: opt.parentId
		}

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
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.storage.deleteProfilePhoto(photo.originalName);
			await this.storage.deleteProfilePhoto(photo.hdName);
			await this.storage.deleteProfilePhoto(photo.sdName);
			await this.db.createHistory(historyObj);
			await this.db.delete(photoKey);

			await this.updateOne(company, companyOptions);

			const searchRecord = {
				objectID: opt.parentId,
				photoUrl: null
			}
			await this.db.algolia.initIndex('companies').partialUpdateObject(searchRecord).wait();

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
		const filmKey = this.db.key([opt.parentKind, +opt.parentId]);

		const roleKey = this.db.key([
			'Company', 
			+opt.companyId,
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
				user: opt.user,
				pKind: opt.parentKind,
				pId: opt.parentId
			}

			await this.db.delete(roleKey);
			await this.db.createHistory(historyObj);

			const [film] = await this.db.get(filmKey);
			film.editVerified = false;
			film.lastUpdated = opt.time;
			await this.db.update(film);
			
			return { 'status': 'deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message);
		}
	}

	// Settings methods
	async verifyEdit(user: string, id: string){
		const time = new Date();
		const companyOptions: CompanyOpt = {
			user: user,
			time: time,
			companyId: id
		}
		const data: UpdateCompanyDto = {
			editVerified: true
		}
		try {
			const {entity, history} = await this.db.updateCompanyEntity(data, companyOptions);
			return entity;
		} catch (err: any){
			console.log()
			throw new BadRequestException(err.message);
		}
	}

	// History
	async findHistory(companyId: string){
		const companyKey = this.db.key(['Company', +companyId]);
		try {
			const [company] = await this.db.get(companyKey);

			const [companyHistory] = await this.db.createQuery('History')
				.filter('xKind', '=', 'Company')
				.filter('xIdentifier', '=', +companyId)
				.filter('xTimestamp', '>', new Date(company.lastVerified))
				.order('xTimestamp', {descending: true}).run();

			const [photoHistory] = await this.db.createQuery('History')
				.filter('xKind', '=', 'CompanyPhoto')
				.filter('xIdentifier', '=', '0')
				.filter('wKind', '=', 'Company')
				.filter('wIdentifier', '=', companyId)
				.filter('xTimestamp', '>', new Date(company.lastVerified))
				.order('xTimestamp', {descending: true}).run();

			const allHistories = [
				...companyHistory, 
				...photoHistory
			];

			const sortedHistory = await this.db.decodeHistory(allHistories);
			 // console.log('Sorted history', sortedHistory)
			return sortedHistory;
		} catch (err: any) {
			throw new NotFoundException(err.message)
		}
	}
}