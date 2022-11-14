import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { AuthService } from '../auth/auth.service'
import { UsersService } from './users.service'

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private authService: AuthService,
		private reflector: Reflector,
		private usersService: UsersService
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const roleAllowed = this.reflector.get<string>('roles', ctx.getHandler());
		const request =  ctx.switchToHttp().getRequest();
		const path = request.url
		console.log("roles allowed")
		console.log(roleAllowed)
		console.log('current path')
		console.log(path)
		if(!roleAllowed){			
			return true;
		}
		
		const token: string = request.headers['authorizationtoken'];		
		console.log('token of the roles guard')
		console.log(token.substring(0, 10))
		const uid = await this.authService.getUserUid(token)

		const user = await this.usersService.findUser(uid)

		if(!user){
			return false;
		}

		const userRole = user.role as string
		console.log(userRole)
		const emailVerified = await this.authService.emailVerified(token);
		console.log(emailVerified)
		const match = this.authService.matchRoles(userRole, roleAllowed, emailVerified, path);
		console.log('The match returned', match)
		return match
	}
}