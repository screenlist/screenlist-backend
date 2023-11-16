import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { FilmsService } from './films.service'

@Injectable()
export class FilmsEditGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private service: FilmsService
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const restricted = this.reflector.get<string>('lock', ctx.getHandler());
		const request =  ctx.switchToHttp().getRequest();
		const path: string = request.url

		if(!restricted){
			return true;
		}

		const id = path.split('/')[2];
		const film = await this.service.findOneDetailsOnly(id);

		if(!film){
			return false;
		}

		if(film.editLocked === true){
			return false;
		} else {
			return true;
		}
	}
}