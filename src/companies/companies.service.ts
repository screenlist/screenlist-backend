import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class CompaniesService {
	constructor(
		private configService: ConfigService,
		private db: DatabaseService
	){
		this.db = new DatabaseService(configService)
	}

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
			return { 'status': 'successfully created' };
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updateOne(data: UpdateCompanyDto, opt: CompanyOpt){
		const {entity, history} = this.db.updateCompanyEntity(data, opt);
		try{
			await this.db.update(entity);
			await this.db.insert(history);
			return { 'status': 'successfully updated' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOne(id: string, user:string){
		const companyKey = this.db.key(['Company', +id]);
		const entities = [{key: companyKey}]; // entites to be deleted
		const history = []; // actions to write into history
		const rolesQuery = this.db.createQuery('CompanyRole').hasAncestor(companyKey);
		try {
			const [roles] = await this.db.runQuery(rolesQuery);
			const [company] = await this.db.get(companyKey);
			history.push(this.db.formulateHistory(company, 'Company', companyKey.id, user, 'delete'));
			roles.forEach((role) => {
				const roleKey = role[this.db.KEY];
				entities.push({key: roleKey});
				history.push(this.db.formulateHistory(role, 'CompanyRole', roleKey.id, user, 'delete'));
			})
			await this.db.transaction().delete(entities);
			await this.db.transaction().insert(history);
			return { 'status': 'successfully deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async createOneRole(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		const {entity, history} = this.db.createCompanyRoleEntity(data, opt);
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'successfully created' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		const entityData = await this.db.updateCompanyRoleEntity(data, opt);
		try {
			await this.db.update(entityData.entity)
			await this.db.insert(entityData.history)
			return { 'status': 'successfully updated' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneRole(opt: CompanyRoleOpt){
		const roleKey = this.db.key(['Company', +opt.companyId, opt.parentKind, +opt.parentId, 'CompanyRole', +opt.roleId]);
		try {
			const [role] = await this.db.get(roleKey);
			const history = this.db.formulateHistory(role, 'CompanyRole', roleKey.id, user, 'delete');
			const entity = {key: roleKey};
			await this.db.delete(entity);
			await this.db.insert(history);
			return { 'status': 'successfully deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}