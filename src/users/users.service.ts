import { 
	Injectable, 
	ParseFileOptions, 
	BadRequestException, 
	NotFoundException, 
	UnauthorizedException,
	ForbiddenException
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';
import { UserOpt, User, VoteOpt, Votes, Request, RequestOpt, UserRoles} from './users.types';
import { 
	CreateUserDto,  
	UpdateUserDto,
	CreateVotesDto,
	UpdateVotesDto,
	CreateRequestDto,
	UpdateRequestDto,
	CreateJournalistInfoDto,
	UpdateJournalistInfoDto,
} from '../users/users.dto';
import { HistoryOpt } from '../database/database.types';
import { ImageOpt } from '../films/films.types';
import { CreateDisplayPhotoDto, UpdateDisplayPhotoDto } from '../films/films.dto';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import fetch from 'cross-fetch';

@Injectable()
export class UsersService {
	constructor(
		private storage: StorageService,
		private authService: AuthService,
		private db: DatabaseService,
		private config: ConfigService
	){}	

	/** GENERAL USER METHODS **/

	async bestowPriviledgedRole(role: UserRoles, uid: string, opt: UserOpt){
		const userKey = this.db.key(['User', uid]);
		try {
			const [user] = await this.db.get(userKey);
			if(user.role === 'admin'){ throw new ForbiddenException() }

			const data: UpdateUserDto = {
				lastUpdated: opt.time,
				role: role,
			}

			const {entity, history} = await this.db.updateUserEntity(data, opt);
			return entity;
		} catch {
			throw new BadRequestException()
		}
	}

	async revokePrivilegedRole(uid: string, opt: UserOpt){
		try{
			const userKey = this.db.key(['User', uid]);
			const [result] =  await this.db.get(userKey);
			if(result){
				const user: User = result;
				if(user.role == 'admin'){
					throw new ForbiddenException();
				}
			}

			const updateUser: UpdateUserDto = {
				lastUpdated: opt.time,
				role: 'member'
			}

			const updateUserOptions: UserOpt = {
				user: uid,
				time: opt.time
			}
			const {entity, history} = await this.db.updateUserEntity(updateUser, updateUserOptions)
			return entity
		} catch {
			throw new BadRequestException()
		}
	}

	async checkUserName(userName: string){
		const name = userName.toLowerCase().replace(/[^0-9a-z]/gi, '')
		const query = this.db.createQuery('User').filter('userName', '=', userName);
		try {
			const [result] = await this.db.runQuery(query)
			const users = result.length;
			return users
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async checkUserNameAdvanced(userName: string){
		const name = userName.toLowerCase().replace(/[^0-9a-z]/gi, '')
		const query = this.db.createQuery('User').filter('userName', '=', userName);
		try {
			const [result] = await this.db.runQuery(query)
			const users = result.length;
			return {
				count: users,
				user: result[0]
			}
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async createUser(data: CreateUserDto, opt: UserOpt){
		data.role = 'member' // assign every new user the member role
		try {	
			const similarUserNames = await this.checkUserName(data.userName);
			if(similarUserNames > 0){
				throw new BadRequestException('Username already taken');
			}

			const {entity, history} = await this.db.createUserEntity(data, opt);
			
			return { 'status': 'created', 'username': entity.data.userName, 'role': entity.data.role };
		} catch(err: any) {
			console.log(err.message)
			throw new BadRequestException(err.message)
		}
	}

	async updateUser(data: UpdateUserDto, opt: UserOpt){
		try {
			if(data.userName){
				const existing = await this.checkUserNameAdvanced(data.userName);

				if(existing.count > 0){
					if(existing.user.userName !== data.userName){
						throw new BadRequestException('Username already taken');
					}
				}
			}

			const {entity, history} = await this.db.updateUserEntity(data, opt);
			return { 'status': 'updated', 'username': entity.userName, 'role': entity.role };
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async deleteUser(opt: UserOpt){
		const profileQuery = this.db.createQuery('User').filter('userName', '=', opt.userName).limit(1)
		const currentUserKey = this.db.key(['User', opt.user])
		try{
			const [currentUser] = await this.db.get(currentUserKey);
			const [profile] = await this.db.runQuery(profileQuery);
			const profileForDeletion = profile[0];
			const profileForDeletionKey = this.db.key(['User', profileForDeletion.uid]);

			// Non admin users cannot delete other users' profiles
			if(currentUser.uid !== profileForDeletion.uid && currentUser.role !== 'admin'){
				throw new ForbiddenException('Action not allowed')
			}

			if(profileForDeletion.hasOwnProperty('mailId')){
				await fetch(`https://api.brevo.com/v3/contacts/${profileForDeletion.mailId}`, {
					method: 'DELETE', 
					headers: {accept: 'application/json'}
				})
			}

			await this.db.algolia.initIndex('users').deleteObject(profileForDeletion.uid)
			await this.db.delete(profileForDeletionKey);
			return { 'status': 'deleted' }
		} catch (err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateUserEmail(opt: UserOpt){
		const userKey = this.db.key(['User', opt.user]);
		try {

			const [user] = await this.db.get(userKey);			
			const record = await this.authService.getUserInfo(opt.user);

			if(!user.hasOwnProperty('mailId')){
				const createContact = await fetch('https://api.brevo.com/v3/contacts', {
					method: 'POST',
					headers: {
						accept: 'application/json', 
						'content-type': 'application/json',
						'api-key': this.config.get('BREVO_KEY')
					},
					body: JSON.stringify({
						email: record.email,
						ext_id: opt.user,
						attributes: {FNAME: user.userName},
						emailBlacklisted: false,
						smsBlacklisted: false,
						listIds: [36],
						updateEnabled: false
					})
				})
				const createContactData = await createContact.json();

				if(!createContact.ok){				
					throw new BadRequestException(createContactData)
				}

				await this.db.updateUserEntity({mailId: createContactData.id, lastUpdated: opt.time}, opt);

				return {email: record.email};
			} else {
				const updateContact = await fetch(`https://api.brevo.com/v3/contacts/${user.mailId}`, {
					method: 'PUT',
					headers: {
						accept: 'application/json', 
						'content-type': 'application/json',
						'api-key': this.config.get('BREVO_KEY')
					},
					body: JSON.stringify({
						attributes: {EMAIL: record.email}
					})
				});

				if(!updateContact.ok){
					throw new BadRequestException(await updateContact.json())
				}

				return {email: record.email};
			}
		} catch(err: any){
			console.log(err)
			throw new BadRequestException(err.message);
		}
	}

	async passwordReset(email: string){
		try{ 
			const [existing] = await this.db.createQuery('Fleet').filter('passwordResetEmail', '=', email).run();
			if(existing.length > 0) { throw new BadRequestException('You have exceeded requests quota') }
			const link = await this.authService.generatePasswordResetLink(email);
			
			await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: {
					accept: 'application/json', 
					'content-type': 'application/json',
					'api-key': this.config.get('BREVO_KEY')
				},
				body: JSON.stringify({
					sender: {name: 'Screen List Support', email: 'support@screenlist.co.za'},
					to: [{email: email}],
					htmlContent: `<!DOCTYPE html> <html> <body> <h1>Reset your password</h1> <p>Hello</p> <p>Follow the link below to reset your Screen List password for your ${email} account.</p> <p><a href="${link}">${link}</a></p> <p>If you didn’t ask to reset your password, you can ignore this email.</p> <p>Thanks</p> <p>Your Screen List team</p> </body> </html>`,
					textContent: `Hello, follow the link below to reset your Screen List password for your ${email} account. ${link} Thanks. Your Screen List team.`,
					subject: 'A Link For Resetting Your Screen List Password',
					replyTo: {email: 'support@screenlist.co.za', name: 'Screen List Support'}
				})
			})

			const fleet = {
				key: this.db.key('Fleet'),
				data: {
					passwordResetEmail: email,
					time: new Date(Date.now()+1000*60*60*12)
				}
			}
			await this.db.insert(fleet);

			return {success: true}
		} catch(err: any){
			console.log(err)
			throw new BadRequestException(err.message);
		}
	}

	async findUser(uid: string){
		const userKey = this.db.key(['User', uid]);
		try {
			const info = await this.db.get(userKey);
			return info[0];
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async findAllUsers(){
		const query = this.db.createQuery('User').order('userName');
		try {
			const [users] = await this.db.runQuery(query);
			return users
		} catch (err){
			throw new NotFoundException(err.message)
		}
	}

	// async userMetrics(){
	// 	try {
			
	// 	} catch (err: any){
	// 		throw new NotFoundException(err.message)
	// 	}
	// }

	async getUserName(uid: string){
		const userKey = this.db.key(['User', uid]);
		const photoKey = this.db.key(['User', uid, 'UserPhoto', '0']);
		try {
			const [info] = await this.db.get(userKey);
			const [photo] = await this.db.get(photoKey);
			const user: User = info;
			return { 'username': user.userName, 'role': user.role, 'photoUrl': photo?.sdUrl };
		} catch(err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async findUserByUsername(username: string){
		const query = this.db.createQuery('User').filter('userName', '=', username).order('userName').limit(1);

		try {
			const [results] = await this.db.runQuery(query);
			if(results.length !== 1){ throw new NotFoundException() }
			const user = results[0]
			const photoKey = this.db.key(['User', user[this.db.KEY]['name'], 'UserPhoto', '0']);
			const coverKey = this.db.key(['User', user[this.db.KEY]['name'], 'UserPhoto', '1'])
			const [photo] = await this.db.get(photoKey);
			const [cover] = await this.db.get(coverKey);

			user.photo = photo ? {
				url: photo?.sdUrl,
				id: photo[this.db.KEY]['name'],
				credit: photo?.attribution,
				altText: photo?.description
			} : null

			user.cover = cover ? {
				url: cover?.sdUrl,
				id: cover[this.db.KEY]['name'],
				credit: cover?.attribution,
				altText: cover?.description
			} : null

			const uid = user[this.db.KEY]['name'];

			// Extensive Creation History
			let [films] = await this.db.createQuery('History')
			.filter('xUser', '=', uid)
			.filter('xKind', '=', 'Film')
			.filter('xAction', '=', 'create')
			.order('xTimestamp', {descending: true}).limit(34).run()
			let [companies] = await this.db.createQuery('History')
			.filter('xUser', '=', uid)
			.filter('xKind', '=', 'Company')
			.filter('xAction', '=', 'create')
			.order('xTimestamp', {descending: true}).limit(33).run()
			let [people] = await this.db.createQuery('History')
			.filter('xUser', '=', uid)
			.filter('xKind', '=', 'Person')
			.filter('xAction', '=', 'create')
			.order('xTimestamp', {descending: true}).limit(33).run()

			films = await Promise.all(
				films.map(async (item) => {
					const filmKey = this.db.key(['Film', +item.xIdentifier]);
					const posterKey = this.db.key(['Film', +item.xIdentifier, 'Poster', '0']);
					try {
						const [film] = await this.db.get(filmKey);
						const [poster] = await this.db.get(posterKey);
						film.poster = poster ? {
							url: poster?.hdUrl,
							id: poster[this.db.KEY]['name'],
							credit: poster?.attribution,
							altText: poster?.description
						} : null
						return {
							...film,
							id: item.xIdentifier
						}
					} catch(err) {
						throw new NotFoundException(err)
					}
				})
			)

			companies = await Promise.all(
				companies.map(async (item) => {
					const companyKey = this.db.key(['Company', +item.xIdentifier]);
					const photoKey = this.db.key(['Company', +item.xIdentifier, 'CompanyPhoto', '0']);
					try {
						const [company] = await this.db.get(companyKey);
						const [photo] = await this.db.get(photoKey);
						company.photo = photo ? {
							url: photo?.hdUrl,
							id: photo[this.db.KEY]['name'],
							credit: photo?.attribution,
							altText: photo?.description
						} : null

						return {
							...company,
							id: item.xIdentifier
						}
					} catch(err) {
						throw new NotFoundException(err)
					}
				})
			)

			people = await Promise.all(
				people.map(async (item) => {
					const personKey = this.db.key(['Person', +item.xIdentifier]);
					const photoKey = this.db.key(['Person', +item.xIdentifier, 'PersonPhoto', '0']);
					try {
						const [person] = await this.db.get(personKey);
						const [photo] = await this.db.get(photoKey);
						person.photo = photo ? {
							url: photo?.sdUrl,
							id: photo[this.db.KEY]['name'],
							credit: photo?.attribution,
							altText: photo?.description
						} : null

						return {
							...person,
							id: item.xIdentifier
						}
					} catch(err) {
						throw new NotFoundException(err)
					}
				})
			)

			let reviews;

			if(user.role === 'journalist') {
				[reviews] = await this.db.createQuery('Rating').filter('authorUid', '=', uid).order('created', {descending: true}).run();
			}

			await this.db.createQuery('Rating').filter('authorUid', '=', uid).order('created', {descending: true}).run();

			return {
				details: user,
				films: films,
				companies: companies,
				people: people,
				reviews: reviews
			}
		} catch (err: any){
			console.log(err)
			throw new NotFoundException()
		}
	}

	async uploadProfilePhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			if(opt.imageId !== '0'){ throw new BadRequestException('Unknown index') }
			const data = await this.storage.uploadProfilePhoto(image);
			const photoData: CreateDisplayPhotoDto = { ...data }
			const {entity, history} = await this.db.createUserPhotoEntity(photoData, opt)
			return { id: entity.key.id, ...entity.data }
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	async updateProfilePhoto(data: UpdateDisplayPhotoDto , opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updateUserPhotoEntity(data, opt);
			return { id: entity[this.db.KEY]['id'], ...entity }
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException()
		}
	}

	async removeProfilePhoto(opt: ImageOpt){
		try {
			const photoKey = this.db.key([opt.parentKind, opt.parentId, 'UserPhoto', opt.imageId]);
			const [photo] = await this.db.get(photoKey);
			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'UserPhoto',
				id: photoKey.id,
				action: 'delete',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.storage.deleteProfilePhoto(photo.originalName);
			await this.storage.deleteProfilePhoto(photo.hdName);
			await this.storage.deleteProfilePhoto(photo.sdName);
			await this.db.createHistory(historyObj);
			await this.db.delete(photoKey);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async uploadCoverPhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			if(opt.imageId !== '1'){ throw new BadRequestException('Unknown index') }
			const data = await this.storage.uploadCover(image);
			const photoData: CreateDisplayPhotoDto = { ...data }
			const {entity, history} = await this.db.createUserPhotoEntity(photoData, opt)
			return { id: entity.key.id, ...entity.data }
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException(err.message)
		}
	}

	// Journalist methods
	async findAllJournalists(){
		const aYearAgo = new Date(Number(new Date) - (1000*60*60*24*30*12))
		const query = this.db.createQuery('User').filter('role', '=', 'journalist').order('name');
		try{
			let [result] = await this.db.runQuery(query)

			result = await Promise.all(
				result.map(async (item) => {
					try {
						const [reviews] = await this.db.createQuery('Rating').filter('authorUid', '=', item.uid).order('created', {descending: true}).run();
						const recentReviews = reviews.filter((val) => Number(new Date(val.created)) > Number(aYearAgo));

						return {
							...item,
							reviewsAllTime: reviews.length,
							reviewsPastYear: recentReviews.length
						}
					} catch (err: any){
						throw new NotFoundException(err.message)
					}
				})
			)

			return result;
		} catch{
			throw new BadRequestException("Could not retrieve users");
		}
	}

	async applyForJournalistRole(data: CreateRequestDto, opt: RequestOpt){
		data.request = 'makeJournalist',
		data.requestSubject = opt.user,
		data.createdBy = opt.user

		const threeMonthsAgo = new Date(Number(opt.time)-(1000*60*60*24*30*3))
		try{
			const [recentRequests] = await this.db.createQuery('Request')
			.filter('createdBy', '=', opt.user)
			.filter('request', '=', 'makeJournalist')
			.filter('created', '>', threeMonthsAgo).run();

			if(recentRequests.length > 0){ throw new BadRequestException('Wait three months from your last attempt and try again') }

			const {entity, history} = await this.db.createRequestEntity(data, opt);
			return entity.data
		} catch (err: any) {
			throw new BadRequestException('action failed');
		}
	}

	async approveToSetJournalist(opt: RequestOpt){
		const data = {
			approved: true
		}
		
		try{
			const {entity, history} = await this.db.updateRequestEntity(data, opt);

			const journalistData: UpdateUserDto = {
				role: 'journalist',
				lastUpdated: opt.time
			} 
			const userOptions: UserOpt = {
				user: entity.requestSubject,
				time: opt.time
			}
			const journalist = await this.db.updateUserEntity(journalistData, userOptions);

			const details = await this.authService.getUserInfo(journalist.entity.uid);

			await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: {
					accept: 'application/json', 
					'content-type': 'application/json',
					'api-key': this.config.get('BREVO_KEY')
				},
				body: JSON.stringify({
					sender: {name: 'Screen List Support', email: 'support@screenlist.co.za'},
					to: [{email: details.email}],
					templateId: 1,
					replyTo: {email: 'support@screenlist.co.za', name: 'Screen List Support'}
				})
			})

			return {request: entity, journalist: journalist.entity};
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException('action failed');
		}
	}

	async rejectToSetJournalist(opt: RequestOpt){
		const data: UpdateRequestDto = { approved: false, acknowledged: true };
		try {
			const {entity} = await this.db.updateRequestEntity(data, opt);
			return entity;
		} catch (err: any) {
			throw new BadRequestException()
		}
	}

	async findAllJournalistRequests(){
		const query = this.db.createQuery('Request')
			.filter('request', '=', 'makeJournalist')
			.filter('approved', '=', false)
			.filter('acknowledged', '=', false);
		try{
			let [requests] = await this.db.runQuery(query);
			requests = await Promise.all(
				requests.map(async (request) => {
					request.id = request[this.db.KEY]['id'];
					const userKey = this.db.key(['User', request.requestSubject])
					const [user] = await this.db.get(userKey)
					request.username = user.userName
					request.displayName = user.displayName
					request.publication = user.publication
					return request
				})
			)
			return requests as Request[]
		} catch{
			throw new NotFoundException();
		}
	}

	async findOneJournalistRequest(id: string){
		const requestKey = this.db.key(['Request', +id])
		try{
			const [request] = await this.db.get(requestKey);
			return request as Request
		} catch {
			throw new NotFoundException();
		}
	}

	async createJournalistInfo(data: CreateJournalistInfoDto, opt: UserOpt){
		try {
			const {entity, history} = await this.db.createJournalistInfoEntity(data, opt);
			await this.db.insert([entity, history]);
			return {'status': 'created'}
		} catch {
			throw new BadRequestException('action failed')
		}
	}

	async updateJournalistInfo(data: UpdateJournalistInfoDto, opt: UserOpt){
		try {
			const {entity, history} = await this.db.updateJournalistInfoEntity(data, opt);
			await this.db.upsert(entity);
			await this.db.insert(history);
			return {'status': 'updated'}
		} catch {
			throw new BadRequestException('action failed')
		}
	}


	// Admin methods
	async findAllAdmins(){
		const query = this.db.createQuery('User').filter('role', '=', 'admin').order('userName');
		try{
			const [result] = await this.db.runQuery(query);
			return result as User[];
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async proposeAdminVote(opt: VoteOpt){
		return await this.proposeRoleVote(opt, 'admin');
	}

	async voteToSetAdmin(opt: VoteOpt){
		return await this.voteToSetRole(opt, 'admin');
	}

	async makeAdmin(uid: string, opt: UserOpt){
		return await this.bestowPriviledgedRole('admin', uid, opt);
	}

	async checkEmptyThrone(opt: UserOpt){
		// This method checks if there are admins
		// If nobody is an admin it checks to see if the current user
		// ranks high enough to grab the opportunity, and if there is
		// nobody in a high ranking role, then the admin role is up for grabs to
		// anyone
		const currentUserKey = this.db.key(['User', opt.user]);
		const dayAgo = new Date(Number(opt.time)-(1000*60*60*24));
		const requestsQuery = this.db.createQuery('Request')
			.filter('request', '=', 'makeAdmin')
			.filter('createdBy', '=', opt.user)
			.filter('requestSubject', '=', opt.user)
			.filter('created', '>=', dayAgo);
		try{
			// First check if there are admins
			const admins = await this.findAllAdmins();
			const totalAdmins = admins.length;

			if(totalAdmins > 0){throw new NotFoundException('Role already filled')}

			// Only give one chance in a day at this, as per the setAdmin method, also give them
			// 5 minutes to use the opportunity. This means a single user has a 5 minute window in
			// a 24 hour cycle to become an admin.
			const [requests] = await this.db.runQuery(requestsQuery);
			if(requests.length > 100){throw new NotFoundException('Daily chance already used')}

			const curators = await this.findAllCurators();
			const moderators = await this.findAllModerators();

			
			const totalCurators = curators.length;
			const totalModerators = moderators.length;

			// This creates a request which is self-fulfillable
			// to be required in the setAdmin method
			const requestDto: CreateRequestDto = {
				request: 'makeAdmin',
				requestSubject: opt.user,
				notes: 'This is a self-service request',
				createdBy: opt.user,
				approved: false,
				acknowledged: false,
				created: opt.time,
				lastUpdated: opt.time,
			}

			if(totalAdmins+totalCurators+totalModerators == 0){
				// If all the upper level roles are empty
				// make the throne available
				const request = await this.db.createRequestEntity(requestDto, opt);				return {'status': 'available', 'id': request.entity.key.id};
			} else if(totalAdmins == 0) {
				const [result] = await this.db.get(currentUserKey);
				const currentUser: User = result;

				if(totalCurators > 0 && currentUser.role == 'curator'){

					const request = await this.db.createRequestEntity(requestDto, opt);
					return {'status': 'available', 'id': request.entity.key.id}
				} else if(totalModerators > 0 && currentUser.role == 'moderator'){

					const request = await this.db.createRequestEntity(requestDto, opt);
					return {'status': 'available', 'id': request.entity.key.id}
				}
			} else {
				throw new NotFoundException('Role already filled')
			}
		} catch(err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async setAdmin(opt: UserOpt){
		// This method enables a user to make themselves an admin.
		// This is provided they qualify, have went through the neccessary 
		// steps to get here and also only if they're the first.
		const currentUserKey = this.db.key(['User', opt.user]);
		const requestKey = this.db.key(['Request', +opt.objectId])
		try {
			const admins = await this.findAllAdmins();
			const totalAdmins = admins.length;

			const [requestResult] = await this.db.get(requestKey);
			const request: Request = requestResult;

			const [result] = await this.db.get(currentUserKey);
			const currentUser: User = result;

			// Statement to test the legitimacy and merit of this request
			if(
				totalAdmins > 0 || 
				request.requestSubject != opt.user || 
				request.createdBy != opt.user ||
				request.approved == true ||
				request.request != 'makeAdmin' ||
				Number(new Date(request.created))+(1000*60*5) < Number(opt.time)
			){
				throw new ForbiddenException('Action not allowed');
			}

			const privilegedRole: UpdateUserDto = {
				role: 'admin',
				lastUpdated: opt.time
			}
			
			const {entity, history} = await this.db.updateUserEntity(privilegedRole, opt);
			return {'status': 'success'};
		} catch(err: any) {
			console.log(err)
			throw new BadRequestException(err.message);
		}
	}

	// Curator methods
	async findAllCurators(){
		const query = this.db.createQuery('User').filter('role', '=', 'curator').order('userName');
		try{
			const [result] = await this.db.runQuery(query);
			return result as User[];
		} catch (err){
			throw new NotFoundException();
		}
	}

	async makeCurator(uid: string, opt: UserOpt){
		return await this.bestowPriviledgedRole('curator', uid, opt);
	}

	async proposeCuratorVote(opt: VoteOpt){
		return await this.proposeRoleVote(opt, 'curator');
	}

	async voteToSetCurator(opt: VoteOpt){
		return await this.voteToSetRole(opt, 'curator');
	}

	// Moderator methods
	async findAllModerators(){
		const query = this.db.createQuery('User').filter('role', '=', 'moderator').order('userName');
		try{
			const [result] = await this.db.runQuery(query);
			return result as User[];
		} catch{
			throw new NotFoundException();
		}
	}

	async makeModerator(uid: string, opt: UserOpt){
		return await this.bestowPriviledgedRole('moderator', uid, opt);
	}

	async proposeModeratorVote(opt: VoteOpt){
		return await this.proposeRoleVote(opt, 'moderator');
	}

	async voteToSetModerator(opt: VoteOpt){
		return await this.voteToSetRole(opt, 'moderator');
	}

	// Other methods
	async voteToSetRole(
		opt: VoteOpt, 
		role: 'admin'|'curator'|'moderator'
	){
		const votesKey = this.db.key(['Vote', +opt.votesId]);
		// There are two users, the one performing the action and the subject thereof.
		const currentUserKey = this.db.key(['User', opt.user]);
		const userToVoteForKey = this.db.key(['User', opt.userToVoteFor]);
		try {
			// Get all stakeholders involved in this vote
			const [votesResult] = await this.db.get(votesKey);
			const [currentUserResult] = await this.db.get(currentUserKey);
			const [userToVoteForResult] = await this.db.get(userToVoteForKey);
			const currentUser: User = currentUserResult;
			const userToVoteFor: User = userToVoteForResult;
			const votes: Votes = votesResult;

			const privilegedRole: UpdateUserDto = {
				role: votes.roleToAttain,
				lastUpdated: opt.time
			}

			const privilegedRoleOptions: UserOpt = {
				user: opt.userToVoteFor,
				time: opt.time
			}

			// To be used to calculate all points of all ranks
			// including of the currentUser, to determine
			// whether the motion is a succes or not
			let totalVotingPoints: number 

			// Add voting points according to the rank of the current user
			// and the role being voted for
			if(role == 'admin' || role == 'curator'){
				if(currentUser.role === 'admin'){
					votes.adminsTotalPoints = votes.adminsTotalPoints+10
					totalVotingPoints = votes.adminsTotalPoints
				}
			} else if(role == 'moderator'){
				if(currentUser.role == 'admin'){
					votes.adminsTotalPoints = votes.adminsTotalPoints+10
					totalVotingPoints = (votes.adminsTotalPoints+votes.curatorsTotalPoints+votes.moderatorsTotalPoints)
				} else if(currentUser.role == 'curator'){
					votes.curatorsTotalPoints = votes.curatorsTotalPoints+5
					totalVotingPoints = (votes.adminsTotalPoints+votes.curatorsTotalPoints+votes.moderatorsTotalPoints)
				} else if(currentUser.role == 'moderator'){
					votes.moderatorsTotalPoints = votes.moderatorsTotalPoints+2
					totalVotingPoints = (votes.adminsTotalPoints+votes.curatorsTotalPoints+votes.moderatorsTotalPoints)
				}
			}

			// Instate the voting outcome if it meets requirements
			// Or just vote if requirements not met yet
			if(votes.totalPointsNeeded <= totalVotingPoints){
				votes.success = true;
				// Update the role of the user being voted for and the votes				
				const {entity, history} = await this.db.updateUserEntity(privilegedRole, privilegedRoleOptions);
				await this.db.update(votes);
				return {'status': 'success'};
			} else {
				const historyOptions: HistoryOpt = {
					action: 'update',
					user: opt.user,
					id: opt.votesId,
					kind: 'Vote',
					dataObject: votes,
					time: opt.time
				}
				await this.db.update(votes);
				return {'status': 'voted'}
			}
		} catch{
			throw new BadRequestException('Action failed');
		}
	}

	async proposeRoleVote( 
		opt: VoteOpt,
		role: 'admin'|'curator'|'moderator'
	){
		const currentUserKey = this.db.key(['User', opt.user])
		try {
			const [result] = await this.db.get(currentUserKey);
			const admins = await this.findAllAdmins();
			const curators = await this.findAllCurators();
			const moderators = await this.findAllAdmins();

			const totalAdmins = admins.length;
			const totalCurators = curators.length;
			const totalModerators = moderators.length;

			const currentUser: User = result;			
			
			if(role == 'admin' || role == 'curator'){
				const voteEntity: CreateVotesDto = {
					roleToAttain: role,
					success: false,
					totalPointsNeeded: totalAdmins*10,
					adminsTotalPoints: 10,
					curatorsTotalPoints: 0,
					moderatorsTotalPoints: 0,
					userSuggested: opt.userToVoteFor,
					created: opt.time,
					lastUpdated: opt.time
				}
				const {entity, history} = await this.db.createVotesEntity(voteEntity, opt);
				return {'status': 'created'}
			} else if(role == 'moderator'){
				// Only 60% of approval points needed for this motion to succeed
				const approvalPoints = ((totalAdmins*10)+(totalCurators*5)+(totalModerators*2))*0.6
				const voteEntity: CreateVotesDto = {
					roleToAttain: 'moderator',
					success: false,
					totalPointsNeeded: approvalPoints,
					adminsTotalPoints: currentUser.role == 'admin' ? 10 : 0,
					curatorsTotalPoints: currentUser.role == 'curator' ? 5 : 0,
					moderatorsTotalPoints: currentUser.role == 'moderator' ? 2 : 0,
					userSuggested: opt.userToVoteFor,
					created: opt.time,
					lastUpdated: opt.time
				}
				const {entity, history} = await this.db.createVotesEntity(voteEntity, opt);
				return {'status': 'created'}
			} else {
				return {'status': 'unsuccessful'}
			}
		} catch{
			throw new BadRequestException('Action failed')
		}
	}
}