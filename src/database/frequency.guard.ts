import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { DatabaseService } from './database.service'

@Injectable()
export class FrequencyGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private db: DatabaseService
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const kind = this.reflector.get<string>('frequency', ctx.getHandler());
		const request =  ctx.switchToHttp().getRequest();
		const path: string = request.url

		if(!kind){ return true }

		const kinds = ['Film', 'Person', 'Company']
		if(kinds.indexOf(kind) < 0){
			return true;
		} else {
			const id = path.split('/')[2];
			await this.db.updateFrequencyEntity(kind, id);
			return true;
		}
	}
}