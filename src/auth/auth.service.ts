import { Injectable, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
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

	async setUserRole(idToken: string, role: string){
		try {
			const {uid} = await this.getAuth().verifyIdToken(idToken, true);
			await this.getAuth().setCustomUserClaims(uid, {[role]: true});
			return {'status': true};
		} catch(err: any) {
			throw new BadRequestException(err.mesaage);
		}
	}

	matchRoles(userRole: string, allowedRole: string){
		const allRoles = ['user', 'moderator', 'curator', 'admin'];
		if(allRoles[userRole] >= 0){
			const allowedPersonel = allRoles.filter((index, arr) => arr[userRole] >= index);
			allowedPersonel.length > 0 ? true : false;
		} else {
			return false;
		}
	}

	async getUserUid(idToken: string){
		try {
			const {uid} = await this.getAuth().verifyIdToken(idToken, true);
			return uid;
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async getUserRole(idToken: string){
		try {
			const token = await this.getAuth().verifyIdToken(idToken, true);
			if(token.admin){
				return 'admin';
			} else if(token.moderator){
				return 'moderator';
			} else if(token.curator){
				return 'curator';
			} else if(token.user){
				return 'user';
			}
		} catch(err: any){
			throw new BadRequestException(err.mesaage);
		}
	}
}