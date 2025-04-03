import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, createClerkClient } from '@clerk/backend';
 
@Injectable()
export class AuthService {
	constructor(private config: ConfigService){}

	public client = createClerkClient({secretKey: this.config.get('CLERK_SECRET_KEY')})

	// async verifyRequest(idToken: string){
	// 	try {
	// 		const token = await this.getAuth().verifyIdToken(idToken, true);
	// 		token ? true : false;
	// 	} catch{
	// 		return false
	// 	}
	// }
	
	public getUserEmail(user: User){
		return user.emailAddresses.find((val) => val.id === user.primaryEmailAddressId).emailAddress;
	}

	matchRoles(userRole: string, thresholdRole: string, verified: boolean, path: string){
		// console.log({userRole, thresholdRole, verified, path})
		// Under no circumstance is an unverified user allowed
		if(verified === false){
			return false
		}
		// All the roles any user can have
		// sorted according to their hierarchy
		const allRoles = ['member', 'journalist', 'moderator', 'curator', 'admin'];
		const thresholdRoleIndex = allRoles.indexOf(thresholdRole);
		const userRoleIndex = allRoles.indexOf(userRole);
		// Allow access to users who meet the specified
		// threshold role
		if((userRoleIndex == 2 || userRoleIndex == 3 || userRoleIndex == 4) && thresholdRoleIndex == 1){
			// This prevents Backers, Moderators and Curators from acting as
			// Journalists
			return false
		}

		// thresholdRoleIndex >= userRoleIndex ? true : false;
		if(userRoleIndex >= thresholdRoleIndex){
			return true
		}	else {
			return false
		}
	}

	// async getUserUid(idToken: string){
	// 	try {
	// 		const {uid} = await this.getAuth().verifyIdToken(idToken, true);
	// 		return uid;
	// 	} catch(err: any) {
	// 		throw new BadRequestException(err.message);
	// 	}
	// }

	// async getUserFromToken(idToken: string){
	// 	try {
	// 		const {uid, email, email_verified} = await this.getAuth().verifyIdToken(idToken, true);
	// 		return {
	// 			uid: uid,
	// 			email: email,
	// 			emailVerified: email_verified
	// 		}
	// 	} catch(err: any) {
	// 		throw new BadRequestException(err.message);
	// 	}
	// }

	// async getUserInfo(uid: string){
	// 	try {
	// 		const user = await this.getAuth().getUser(uid);
	// 		return user;
	// 	} catch (err: any){
	// 		throw new BadRequestException(err.message)
	// 	}
	// }

	// async generatePasswordResetLink(email: string){
	// 	try {
	// 		const user = await this.getAuth().getUserByEmail(email);
	// 		if(!user){ throw new BadRequestException('Email not found') }
	// 		return await this.getAuth().generatePasswordResetLink(user.email)
	// 	} catch(err: any){
	// 		throw new BadRequestException(err.message)
	// 	}
	// }
}