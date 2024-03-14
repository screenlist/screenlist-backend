import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { DatabaseService } from './database.service'
import { Collection } from './database.types';

@Injectable()
export class FrequencyGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private mongo: DatabaseService
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const kind = this.reflector.get<Collection>('hit', ctx.getHandler());
		const request =  ctx.switchToHttp().getRequest();
		const path: string = request.url

		if(!kind){ return true } else {
			const id = path.split('/')[2];
			await this.mongo.addHit(kind, id);
			return true;
		}
	}
}