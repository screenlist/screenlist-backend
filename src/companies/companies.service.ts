import { Injectable, NotFoundException } from '@nestjs/common';
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

		try {
			const [details] = await this.datastore.get(companyKey);
		} catch{
			throw new NotFoundException('Company not found')
		}
	}
}
