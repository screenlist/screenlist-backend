import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { FilmsService } from './films.service'
import { EditFor } from './films.types';
import { CompaniesService } from 'src/companies/companies.service';
import { PeopleService } from 'src/people/people.service';

@Injectable()
export class EditGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private filmsService: FilmsService,
		private companiesService: CompaniesService,
		private peopleService: PeopleService
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const restricted = this.reflector.get<EditFor>('lock', ctx.getHandler());
		const request =  ctx.switchToHttp().getRequest();
		const path: string = request.url

		if(!restricted){
			return true;
		}

		const id = path.split('/')[2];
		
		if(restricted === 'films' ){

			const document = await this.filmsService.findOneDetailsOnly(id);
			if(!document){ return false; }

			switch(document.editLocked){
				case true:
					return false;
				default:
					return true
			}

		} else if(restricted === 'companies'){

			const document = await this.companiesService.findOneDetailsOnly(id);
			if(!document){ return false; }

			switch(document.editLocked){
				case true:
					return false;
				default:
					return true
			}

		} else if(restricted === 'people'){

			const document = await this.peopleService.findOneDetailsOnly(id);
			if(!document){ return false; }

			switch(document.editLocked){
				case true:
					return false;
				default:
					return true
			}

		}
		
	}
}