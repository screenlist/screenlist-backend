import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core'
import { WebhookEvent } from '@clerk/clerk-sdk-node';
import { Webhook } from 'svix';
import { AuthService } from '../auth/auth.service'
import { DatabaseService } from 'src/database/database.service'; 
import { ConfigService } from '@nestjs/config';
import { UserExt, UserRoles } from './users.types';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private authService: AuthService,
		private reflector: Reflector,
		private config: ConfigService,
		private mongo: DatabaseService
	){}

	async canActivate(
		ctx: ExecutionContext
	): Promise<boolean>{
		const roleAllowed = this.reflector.get<UserRoles>('roles', ctx.getHandler());
		const request =  ctx.switchToHttp().getRequest();
		const path = request.url
		const method = request.method
		// console.log(path)
		// console.log(request.headers['authorization'])
		
		if(path === '/users/webhooks'){
			const webhookSecret = this.config.get('CLERK_WEBHOOK_SECRET')
			const payloadString = JSON.stringify(request.body)
			const headers = request.headers;

			const svixHeaders = {
				"svix-id": headers["svix-id"]!,
				"svix-timestamp": headers["svix-timestamp"]!,
				"svix-signature": headers["svix-signature"]!,
			};

			const wh = new Webhook(webhookSecret).verify(payloadString, svixHeaders) as WebhookEvent;
			if(wh) {
				return true
			} else {
				return false
			}
		}

		if(!roleAllowed){
			return true;
		}
		console.log('role found')

		try {
			const jwt = await this.authService.client.verifyToken(request.headers['authorization'].split(' ')[1])
			const unixTimestamp = Math.floor(Date.now()/1000)
			const clientHost = this.config.get('CLIENT_URL')
			// console.log(unixTimestamp > jwt.exp)
			// console.log(jwt.nbf > unixTimestamp)
			// console.log(jwt.azp !== clientHost)
			// Check if the current time is before jwt expiry but after the not before value and if 
			// the orign of the jwt matches the clent host
			if( unixTimestamp > jwt.exp || jwt.nbf > unixTimestamp || jwt.azp !== clientHost){ return false }

			const user = 	await this.authService.client.users.getUser(jwt.sub)
			
			const userExt = await this.mongo.db.collection<UserExt>('users').findOne({id: user.id})
			request.headers['x-user-id'] = user.id
			
			const role = userExt.role
			const emailVerified = user.emailAddresses.find((val) => val.id === user.primaryEmailAddressId).verification.status === 'verified' ? true : false

			const match = this.authService.matchRoles(role, roleAllowed, emailVerified, path);
			console.log('The match returned', match)

			// Member contribution quota check before verdict
			const isEvaluatedPath = (/^\/films/).test(path) || (/^\/people/).test(path) || (/^\/companies/).test(path)
			const isPostOrPatch = method === 'POST' || method === 'PATCH';
			if(match === true && role === 'member' && isEvaluatedPath && isPostOrPatch){
				return await this.mongo.validateEditsQuota(user.id)
			}

			return match
		} catch (err: any){
			console.log(err.message)
			return false
		}
	}
}