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
		const roleAllowed = this.reflector.get<string>('roles', ctx.getHandler());
		console.log("roles allowed")
		console.log(roleAllowed)
		if(!roleAllowed){
			return true;
		}

		const request =  ctx.switchToHttp().getRequest();
		const token: string = request.headers['authorizationtoken'];
		const path = request.url
		console.log('token of the roles guard')
		console.log(token)
		console.log(path)
		const uid = await this.authService.getUserUid(token)
		const userRole = await this.authService.getUserRole(uid);
		console.log(userRole)
		console.log(await this.authService.emailVerified(token))
		const emailVerified = await this.authService.emailVerified(token);
		console.log(emailVerified)
		return this.authService.matchRoles(userRole, roleAllowed, emailVerified, path);
	}
}