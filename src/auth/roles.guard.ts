import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { AuthService } from './auth.service'

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private authService: AuthService,
		private reflector: Reflector
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const roleAllowed = this.reflector.get<string>('role', ctx.getHandler());
		if(!roleAllowed){
			return true;
		}

		const request =  ctx.switchToHttp().getRequest();
		const token: string = request.headers['UserToken'];
		const userRole = await this.authService.getUserRole(token);
		return this.authService.matchRoles(userRole, roleAllowed);
	}
}