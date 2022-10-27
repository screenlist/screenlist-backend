import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { UserOpt, User } from '../users/users.types';
import { HistoryOpt } from '../database/database.types';

@Injectable()
export class AuthService {

	private app = admin.initializeApp({
		credential: admin.credential.cert(path.join(__dirname,'../../config/id.json'))
	})
	private getAuth = this.app.auth;
	async verifyRequest(idToken: string){
		try {
			const token = await this.getAuth().verifyIdToken(idToken, true);
			token ? true : false;
		} catch{
			return false
		}
	}

	async emailVerified(idToken: string){
		try {
			const currentUser = await this.getAuth().verifyIdToken(idToken, true);
			console.log(currentUser.email_verified)
			return currentUser.email_verified
		} catch {
			return false
		}
	}

	matchRoles(userRole: string, thresholdRole: string, verified: boolean, path: string){
		// Under no circumstance is an unverified user allowed
		if(verified === false && path == '/users/auth'){
			return true
		} else if(verified === false){
			return false
		}
		// All the roles any user can have
		// sorted according to their hierarchy
		const allRoles = ['member', 'journalist','moderator', 'curator', 'admin'];
		const thresholdRoleIndex = allRoles.indexOf(thresholdRole);
		const userRoleIndex = allRoles.indexOf(userRole);
		// Allow access to users who meet the specified
		// threshold role
		if((userRoleIndex == 2 || userRoleIndex == 3) && thresholdRoleIndex == 1){
			// This prevents Moderators and Curators from acting as
			// Journalists
			return false
		} else {
			thresholdRoleIndex >= userRoleIndex ? true : false;
		}
	}

	async getUserUid(idToken: string){
		try {
			const {uid} = await this.getAuth().verifyIdToken(idToken, true);
			return uid;
		} catch(err: any) {
			throw new BadRequestException(err.mesaage);
		}
	}
}