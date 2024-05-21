import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { DatabaseService } from './database.service'
import { AuthService } from 'src/auth/auth.service';
import { Collection } from './database.types';
import { ConfigService } from '@nestjs/config';
import { UserExt } from 'src/users/users.types';

@Injectable()
export class FrequencyGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private mongo: DatabaseService,
		private authService: AuthService,
		private config: ConfigService
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const kind = this.reflector.get<Collection>('hit', ctx.getHandler());
		const request =  ctx.switchToHttp().getRequest();
		const path: string = request.url

		try {
			if(request.headers['authorization']){
				const jwt = await this.authService.client.verifyToken(request.headers['authorization'].split(' ')[1])
				const unixTimestamp = Math.floor(Date.now()/1000)
				const clientHost = this.config.get('CLIENT_URL')
				if( unixTimestamp < jwt.exp && jwt.nbf < unixTimestamp && jwt.azp === clientHost){ 
					request.headers['x-user-id'] = jwt.sub
				}
			}			

			if(!kind){ return true } else {
				const id = path.split('/')[2];
				const real = await this.mongo.db.collection(kind).findOne({id: id})
				if(real){
					await this.mongo.addHit(kind, id);			
				}
				return true;
			}
		} catch(err: any){ console.log(err); return true; }

		
	}
}