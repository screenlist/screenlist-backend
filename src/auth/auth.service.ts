import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { UserOpt, User } from '../users/users.types';
import { HistoryOpt } from '../database/database.types';

@Injectable()
export class AuthService {
	constructor(
		private db: DatabaseService
	){}

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

	async setCustomUserClaims(uid: string, role: string){
		try{
			return await this.getAuth().setCustomUserClaims(uid, {[role]: true});
		} catch(err: any){
			throw new BadRequestException(err.mesaage);
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
		console.log(thresholdRoleIndex)
		console.log(userRoleIndex)
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

	async updateProfilePicture(uid: string, url: string){
		try {
			const user =  await this.getAuth().updateUser(uid, { photoURL: url });
			return user;
		} catch {
			throw new BadRequestException();
		}
	}

	async removeProfilePicture(uid: string){
		try {
			return await this.getAuth().updateUser(uid, { photoURL: null })
		} catch {
			throw new BadRequestException()
		}
	}

	async updateDisplayName(uid: string, displayName: string){
		try {
			const user =  await this.getAuth().updateUser(uid, { displayName: displayName });
			return user;
		} catch {
			throw new BadRequestException();
		}
	}

	async disableUserAccount(uid: string){
		try {
			const user =  await this.getAuth().updateUser(uid, { disabled: true });
			return user;
		} catch {
			throw new BadRequestException();
		}
	}

	async enableUserAccount(uid: string){
		try {
			const user =  await this.getAuth().updateUser(uid, { disabled: false });
			return user;
		} catch {
			throw new BadRequestException();
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

	async getUser(uid: string){
		try {
			const user = await this.getAuth().getUser(uid)
			return user;
		} catch {
			throw new BadRequestException();
		}
	}

	async getUserRole(uid: string){
		try {
			const {customClaims} = await this.getAuth().getUser(uid);
			if(customClaims['admin']){
				return 'admin';
			} else if(customClaims['moderator']){
				return 'moderator';
			} else if(customClaims['curator']){
				return 'curator';
			} else if(customClaims['member']){
				return 'member';
			} else if(customClaims['journalist']){
				return 'journalist';
			}
		} catch(err: any){
			console.log('getUserRole error')
			console.log(err.errorInfo.message)
			throw new BadRequestException(err.message);
		}
	}

	// Redundant for now
	async retrieveUsers(
		identifiersArray: Array<{uid: string}>, 
		end: number
	):Promise<any[]>{
		const repeat = false
		if(identifiersArray.length < end){
			end = identifiersArray.length - 1;
		}
		// Copy UIDs to be used
		const searchIds = identifiersArray.slice(0, end++);
		const {users} = await this.getAuth().getUsers(searchIds);
		identifiersArray.splice(0, searchIds.length);
		if(identifiersArray.length === 0){
			return users
		} else {
			return users.concat(await this.retrieveUsers(identifiersArray, 100));
		}
	}
}