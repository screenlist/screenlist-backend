import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { 
	CreatePrivilegedUserDto,  
	UpdatePrivilegedUserDto 
} from '../users/users.dto';
import { UserOpt, SuperUser } from '../users/users.types';
import { HistoryOpt } from '../database/database.types';

@Injectable()
export class AuthService {
	constructor(
		private db: DatabaseService
	){}

	private app = admin.initializeApp({
		credential: admin.credential.cert('../../config/id.json')
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
			currentUser.email_verified === true ? true : false
		} catch {
			return false
		}
	}

	async setUserRole(data: CreatePrivilegedUserDto, opt: UserOpt){
		try {
			await this.getAuth().setCustomUserClaims(data.uid, {[data.role]: true});
			// Persist priviledged users in the database for easy quering later
			if(data.role == 'admin'|| 
				data.role == 'curator' || 
				data.role == 'moderator' || 
				data.role == 'journalist'
			){
				const {entity, history} = this.db.createPrivilegedUserEntity(data, opt);
				await this.db.insert([entity, history]);
				return {'status': true};
			} else {
				return {'status': true};
			}
		} catch(err: any) {
			throw new BadRequestException(err.mesaage);
		}
	}

	async setCustomUserClaims(uid: string, role: string){
		try{
			return await this.getAuth().setCustomUserClaims(uid, {[role]: true});
		} catch(err: any){
			throw new BadRequestException(err.mesaage);
		}
	}

	async updateUserToPriviledgedRole(data: UpdatePrivilegedUserDto, opt: UserOpt){
		try {
			// Update priviledged user in the database for easy quering later
			if(data.role == 'admin'|| 
				data.role == 'curator' || 
				data.role == 'moderator' || 
				data.role == 'journalist'
			){
				const {entity, history} = this.db.updatePrivilegedUserEntity(data, opt);
				await this.getAuth().setCustomUserClaims(data.uid, {[data.role]: true});
				await this.db.update(entity);
				await this.db.insert(history);
				return {'status': 'updated'};
			}
		} catch(err: any) {
			throw new BadRequestException(err.mesaage);
		}
	}

	async updatePrivilegedUserToBasicRole(user: string, opt: UserOpt){
		try {
			// Delete priviledged user from the database
			// Set custom claims to just "user"
			const userKey = this.db.key(['User', user]) 
			const [userEntity] = await this.db.get(userKey)
			const historyOptions: HistoryOpt = {
				data: userEntity,
				time: opt.time,
				action: 'delete',
				user: opt.user,
				id: user,
				kind: 'User'
			}
			const history = this.db.formulateHistory(historyOptions);
			await this.getAuth().setCustomUserClaims(user, {'member': true});
			await this.db.delete(userEntity);
			await this.db.insert(history);
			return {'status': true};
		} catch(err: any) {
			throw new BadRequestException(err.mesaage);
		}
	}

	matchRoles(userRole: string, thresholdRole: string, verified: boolean){
		// Under no circumstance is an unverified user allowed
		if(verified === false){
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
		} catch {
			throw new BadRequestException();
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

	async getPrivilegedUsers(role: string){
		const query = this.db.createQuery('User').filter('role', '=', role).order('uid');
		const users = []
		try {
			const [admins] = await this.db.runQuery(query);
			const identifiers = admins.map((user: SuperUser) => ({ uid: user.uid}));
			const users = await this.retrieveUsers(identifiers, 100)
			return users
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async getUserRole(idToken: string){
		try {
			const {uid} = await this.getAuth().verifyIdToken(idToken, true);
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
			throw new BadRequestException(err.mesaage);
		}
	}

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