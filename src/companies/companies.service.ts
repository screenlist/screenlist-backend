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
	CompanyType
} from './companies.types';

@Injectable()
export class CompaniesService {
	constructor(
		private configService: ConfigService,
		private datastore: DatabaseService
	){
		this.datastore = new DatabaseService(configService)
	}

	async findAll(): Promise<Company[]>{
		const query = this.datastore.createQuery('Company').order('name').limit(20);
		try{
			const [companies] = await this.datastore.runQuery(query);
			return companies
		} catch {
			throw new NotFoundException('Could not retrieve companies');
		}
	}

	async findOne(id: string): Promise<CompanyType>{
		const companyKey = this.datastore.key(['Company', +id]);
		const filmProductionQuery = this.datastore.createQuery('CompanyRole')
			.hasAncestor(companyKey)
			.filter('type', '=', 'production')
			.filter('ownerKind', '=', 'Film')
		const filmDistributionQuery = this.datastore.createQuery('CompanyRole')
			.hasAncestor(companyKey)
			.filter('type', '=', 'distribution')
			.filter('ownerKind', '=', 'Film')
		const seriesProductionQuery = this.datastore.createQuery('CompanyRole')
			.hasAncestor(companyKey)
			.filter('type', '=', 'production')
			.filter('ownerKind', '=', 'Series')
		try {
			const [details] = await this.datastore.get(companyKey);
			const [filmProduction] = await this.datastore.runQuery(filmProductionQuery);
			const [seriesProduction] = await this.datastore.runQuery(seriesProductionQuery);
			const [filmDistribution] = await this.datastore.runQuery(filmDistributionQuery);
			filmDistribution.map(async (role) => {
				const key = this.datastore.key(['Film', +role.ownerId])
				const [film] = await this.datastore.get(key)
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

	async createOne(data: CreateCompanyDto, user: string){
		const time = new Date()
		const entityData = this.datastore.createCompanyEntity(data, time, user);
		const insertion = [entityData.history, entityData.entity]
		try {
			await this.datastore.insert(insertion)
			return { 'status': 'successfully created company' }
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async updateOne(data: UpdateCompanyDto, user: string){
		const time = new Date();
		const entityData = this.datastore.updateCompanyEntity(data, time, user);
		try{
			await this.datastore.update(entityData.entity)
			await this.datastore.insert(entityData.history)
			return { 'status': 'successfully updated company' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async createOneRole(data: CreateCompanyRoleDto, parentKind: string, parentId: string, user: string){
		const time = new Date();
		const entityData = await this.datastore.createCompanyRoleEntity(data, parentId, time, user, parentKind);
		const insertion = []
		insertion.push(...entityData.entities,...entityData.history)
		try{
			await this.datastore.insert(insertion);
			return { 'status': 'successfully created role' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdateCompanyRoleDto, parentKind: string, parentId: string, user: string){
		const time = new Date();
		const entityData = await this.datastore.updateCompanyRoleEntity(data, parentId, time, user, parentKind);
		try {
			await this.datastore.update(entityData.entities)
			await this.datastore.insert(entityData.history)
			return { 'status': 'successfully updated role' }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}
}