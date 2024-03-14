import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { EditFor, Film } from 'src/films/films.types';
import { DatabaseService } from 'src/database/database.service';
import { Company } from 'src/companies/companies.types';
import { Person } from 'src/people/people.types';

@Injectable()
export class EditGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private mongo: DatabaseService
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

			const document = await this.mongo.db.collection<Film>('films').findOne({id: id})
			if(!document){ return false; }

			switch(document.editLocked){
				case true:
					return false;
				default:
					return true
			}

		} else if(restricted === 'companies'){

			const document = await this.mongo.db.collection<Company>('companies').findOne({id: id})
			if(!document){ return false; }

			switch(document.editLocked){
				case true:
					return false;
				default:
					return true
			}

		} else if(restricted === 'people'){

			const document = await this.mongo.db.collection<Person>('people').findOne({id: id})
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