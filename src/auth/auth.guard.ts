import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const request =  ctx.switchToHttp().getRequest();
		const token: string = request.headers['UserToken'];
		return await this.authService.verifyRequest(token)
	}
}