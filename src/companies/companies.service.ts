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
			const [companies] = await this.db.runQuery(query);
			return companies
		} catch {
			throw new NotFoundException('Could not retrieve companies');
		}
	}

	async findOne(id: string): Promise<CompanyType>{
		const companyKey = this.db.key(['Company', +id]);
		const filmProductionQuery = this.db.createQuery('CompanyRole')
			.hasAncestor(companyKey)
			.filter('type', '=', 'production')
			.filter('ownerKind', '=', 'Film')
		const filmDistributionQuery = this.db.createQuery('CompanyRole')
			.hasAncestor(companyKey)
			.filter('type', '=', 'distribution')
			.filter('ownerKind', '=', 'Film')
		const seriesProductionQuery = this.db.createQuery('CompanyRole')
			.hasAncestor(companyKey)
			.filter('type', '=', 'production')
			.filter('ownerKind', '=', 'Series')
		try {
			const [details] = await this.db.get(companyKey);
			const [filmProduction] = await this.db.runQuery(filmProductionQuery);
			const [seriesProduction] = await this.db.runQuery(seriesProductionQuery);
			const [filmDistribution] = await this.db.runQuery(filmDistributionQuery);
			filmDistribution.map(async (role) => {
				const key = this.db.key(['Film', +role.ownerId])
				const [film] = await this.db.get(key)
				return {
					filmName: film.name,
					year: role.year,
					slug: film.slug
				}
			})
			return {
				details,
				filmProduction,
				seriesProduction,
				filmDistribution
			}
		} catch{
			throw new NotFoundException('Company not found')
		}
	}

	async createOne(data: CreateCompanyDto, opt: CompanyOpt){
		const {entity, history} = this.db.createCompanyEntity(data, opt);
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'created', 'company_id': entity.key.id };
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updateOne(data: UpdateCompanyDto, opt: CompanyOpt){
		const {entity, history} = await this.db.updateCompanyEntity(data, opt);
		try{
			await this.db.upsert([entity, history]);
			return { 'status': 'updated', 'company_id': entity.key.id }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(opt: CompanyOpt){
		const companyKey = this.db.key(['Company', +opt.companyId]);
		const entities = [{key: companyKey}]; // entites to be deleted
		const history = []; // actions to write into history
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
			history.push(this.db.formulateHistory(historyObj));
			roles.forEach((role) => {
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
				history.push(this.db.formulateHistory(roleHistoryObj));
			})
			await this.db.delete(entities);
			await this.db.insert(history);
			return { 'status': 'deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: CompanyOpt, image: Express.Multer.File){
		try {
			const file = await this.storage.uploadProfilePhoto(image)
			const dto: UpdateCompanyDto = {
				profilePhotoUrl: file.url,
				profilePhotoOriginalName: file.originalName
			}
			const {entity, history} = await this.db.updateCompanyEntity(dto, opt);
			await this.db.upsert([entity, history]);
			return { 'status': 'created', 'image_url': entity.data.profilePhotoUrl }
		} catch {
			throw new BadRequestException()
		}
	}

	async removePhoto(opt: CompanyOpt){
		try{
			const companyKey = this.db.key(['Company', +opt.companyId]);
			const [result] = await this.db.get(companyKey);
			const company: Company = result 
			const dto: UpdateCompanyDto = {
				profilePhotoUrl: null,
				profilePhotoOriginalName: null
			}
			const {entity, history} = await this.db.updateCompanyEntity(dto, opt);
			await this.storage.deletePoster(company.profilePhotoOriginalName);
			await this.db.upsert([entity, history]);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async createOneRole(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		const {entity, history} = this.db.createCompanyRoleEntity(data, opt);
		if(!data.type){
			throw new BadRequestException('role type not specified')
		}
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'created', 'role_id': entity[this.db.KEY]['id'] }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		const entityData = await this.db.updateCompanyRoleEntity(data, opt);
		try {
			await this.db.upsert([entityData.entity, entityData.history]);
			return { 'status': 'updated', 'role_id': entityData.entity[this.db.KEY]['id'] }
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
			const history = this.db.formulateHistory(historyObj);
			const entity = {key: roleKey};
			await this.db.delete(entity);
			await this.db.insert(history);
			return { 'status': 'deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}