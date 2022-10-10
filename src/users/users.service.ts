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
import { UserOpt, User, VoteOpt, Votes, Request, RequestOpt} from './users.types';
import { 
	CreatePrivilegedUserDto,  
	UpdatePrivilegedUserDto,
	CreateVotesDto,
	UpdateVotesDto,
	CreateRequestDto,
	UpdateRequestDto,
	CreateJournalistInfoDto,
	UpdateJournalistInfoDto
} from '../users/users.dto';
import { HistoryOpt } from '../database/database.types';

@Injectable()
export class UsersService {
	constructor(
		private authService: AuthService,
		private db: DatabaseService
	){}	

	/** GENERAL METHODS **/

	async findAllJournalists(){
		try{
			const users = await this.authService.getPrivilegedUsers('journalist');
			return users;
		} catch{
			throw new BadRequestException("Could not retrieve users");
		}
	}

	async applyForJournalistRole(data: CreateRequestDto, opt: RequestOpt){
		data.request = 'makeJournalist',
		data.requestSubject = opt.user,
		data.createdBy = opt.user
		try{
			const {entity, history} = await this.db.createRequestEntity(data, opt);
			await this.db.transaction().insert([entity, history]);
			return {'status': 'created'};
		} catch{
			throw new BadRequestException('action failed');
		}
	}

	async approveToSetJournalist(data: UpdateRequestDto, opt: RequestOpt){
		const journalistData: CreatePrivilegedUserDto = {
			uid: data.requestSubject,
			role: 'journalist',
			created: opt.time,
			lastUpdated: opt.time
		} 
		const userOptions: UserOpt = {
			user: opt.user,
			time: opt.time
		}
		try{
			const {entity, history} = await this.db.updateRequestEntity(data, opt);
			const journalist = await this.db.createPrivilegedUserEntity(journalistData, userOptions);
			await this.db.update(entity);
			await this.authService.setCustomUserClaims(data.requestSubject, 'journalist');
			await this.db.insert([history, journalist.entity, journalist.history]);
			return {'status': 'created'};
		} catch{
			throw new BadRequestException('action failed');
		}
	}

	async revokePrivilegedRole(uid: string, opt: UserOpt){
		return await this.authService.updatePrivilegedUserToBasicRole(uid, opt);
	}

	async findAllJournalistRequests(){
		const query = this.db.createQuery('Request').filter('request', '=', 'makeJournalist');
		try{
			const [requests] = await this.db.runQuery(query);
			requests.map((request: Request) => {
				request.id = request[this.db.KEY]['id'];
				return request
			})
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
																	.filter('created', '<=', dayAgo);
		try{
			// Only give one chance in a day at this, as per the setAdmin method, also give them
			// 5 minutes to use the opportunity. This means a single user has a 5 minute window in
			// a 24 hour cycle to become an admin.
			const [requests] = await this.db.runQuery(requestsQuery);
			if(requests.length > 0){
				return {'status': 'unavailable'}
			}

			const admins = await this.findAllAdmins();
			const curators = await this.findAllCurators();
			const moderators = await this.findAllAdmins();

			const totalAdmins = admins.length;
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
				created: opt.time,
				lastUpdated: opt.time,
			}
			const request = await this.db.createRequestEntity(requestDto, opt);

			if(totalAdmins+totalCurators+totalModerators == 0){
				// If all the upper level roles are empty
				// make the throne available
				await this.db.insert([request.entity, request.history]);
				return {'status': 'available', 'request_id': request.entity.key.id};
			} else if(totalAdmins == 0) {
				const [result] = await this.db.get(currentUserKey);
				const currentUser: User = result;

				if(totalCurators > 0 && currentUser.role == 'curator'){

					await this.db.insert([request.entity, request.history]);
					return {'status': 'available', 'request_id': request.entity.key.id}
				} else if(totalModerators > 0 && currentUser.role == 'moderator'){

					await this.db.insert([request.entity, request.history]);
					return {'status': 'available', 'request_id': request.entity.key.id}
				}
			} else {
				return {'status': 'unavailable'}
			}
		} catch {
			throw new NotFoundException()
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
			await this.db.update(entity);
			await this.db.insert(history);
			return {'status': 'updated'}
		} catch {
			throw new BadRequestException('action failed')
		}
	}

	/** ROLE VOTING METHODS **/

	// Admin methods
	async findAllAdmins(){
		try{
			const users = await this.authService.getPrivilegedUsers('admin');
			return users;
		} catch{
			throw new BadRequestException("Could not retrieve users");
		}
	}

	async proposeAdminVote(data: CreatePrivilegedUserDto, opt: VoteOpt){
		return await this.proposeRoleVote(data, opt, 'admin');
	}

	async voteToSetAdmin(data: CreatePrivilegedUserDto, opt: VoteOpt){
		return await this.voteToSetRole(data, opt, 'admin');
	}

	async setAdmin(opt: UserOpt){
		// This method enables a user to make themselve an admin.
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
				Number(request.created)+(1000*60*5) > Number(opt.time)
			){
				throw new ForbiddenException();
			}

			const privilegedRole: CreatePrivilegedUserDto = {
				uid: opt.user,
				role: 'admin',
				created: opt.time,
				lastUpdated: opt.time
			}

			if(currentUser){
				currentUser.role = 'admin'
				const historyOptions: HistoryOpt = {
					action: 'update',
					user: opt.user,
					id: opt.user,
					kind: 'User',
					data: {'role': currentUser.role},
					time: opt.time
				}
				const history = this.db.formulateHistory(historyOptions);
				await this.authService.setCustomUserClaims(currentUser.uid, 'admin');
				await this.db.update(currentUser);
				await this.db.insert(history);
				return {'status': 'success'};
			} else {
				const {entity, history} = await this.db.createPrivilegedUserEntity(privilegedRole, opt);
				await this.authService.setCustomUserClaims(privilegedRole.uid, privilegedRole.role);
				await this.db.insert([entity, history]);
				return {'status': 'success'};
			}
		} catch {
			throw new BadRequestException();
		}
	}

	// Curator methods
	async findAllCurators(){
		try{
			const users = await this.authService.getPrivilegedUsers('curator');
			return users;
		} catch{
			throw new BadRequestException("Could not retrieve users");
		}
	}

	async proposeCuratorVote(data: CreatePrivilegedUserDto, opt: VoteOpt){
		return await this.proposeRoleVote(data, opt, 'curator');
	}

	async voteToSetCurator(data: CreatePrivilegedUserDto, opt: VoteOpt){
		return await this.voteToSetRole(data, opt, 'curator');
	}

	// Moderator methods
	async findAllModerators(){
		try{
			const users = await this.authService.getPrivilegedUsers('moderator');
			return users;
		} catch{
			throw new BadRequestException("Could not retrieve users");
		}
	}

	async proposeModeratorVote(data: CreatePrivilegedUserDto, opt: VoteOpt){
		return await this.proposeRoleVote(data, opt, 'moderator');
	}

	async voteToSetModerator(data: CreatePrivilegedUserDto, opt: VoteOpt){
		return await this.voteToSetRole(data, opt, 'moderator');
	}

	// Other methods
	async voteToSetRole(
		data: CreatePrivilegedUserDto, 
		opt: VoteOpt, 
		role: 'admin'|'curator'|'moderator'
	){
		const votesKey = this.db.key(['Vote', +opt.votesId]);
		const currentUserQuery = this.db.createQuery('User').filter('uid', '=', opt.user).limit(1);
		const votedUserQuery = this.db.createQuery('User').filter('uid', '=', data.uid).limit(1);
		try {
			// Get all stakeholders involved in this vote
			const [result] = await this.db.get(votesKey);
			const [currentUserResult] = await this.db.runQuery(currentUserQuery);
			const [votedUserResult] = await this.db.runQuery(votedUserQuery);
			const currentUser: User = currentUserResult[0];
			const votedUser: User = votedUserResult[0];
			const votes: Votes = result;

			const privilegedRole: CreatePrivilegedUserDto = {
				uid: data.uid,
				role: votes.roleToAttain,
				created: opt.time,
				lastUpdated: opt.time
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

				// If the user being voted already holds a certain non basic role
				// update their existing entity instead of creating a new one
				if(votedUser){
					votedUser.role = votes.roleToAttain
					const historyOptions: HistoryOpt = {
						action: 'update',
						user: opt.user,
						id: data.uid,
						kind: 'User',
						data: {'role': votedUser.role},
						time: opt.time
					}
					const history = this.db.formulateHistory(historyOptions)
					await this.authService.setCustomUserClaims(votedUser.uid, votedUser.role)
					await this.db.update([votedUser, votes]);
					await this.db.insert(history);
					return {'status': 'success'};
				} else {
					const {entity, history} = await this.db.createPrivilegedUserEntity(privilegedRole, opt);
					await this.authService.setCustomUserClaims(privilegedRole.uid, privilegedRole.role);
					await this.db.update(votes);
					await this.db.insert([entity, history]);
					return {'status': 'success'};
				}
			} else {
				const historyOptions: HistoryOpt = {
					action: 'update',
					user: opt.user,
					id: opt.votesId,
					kind: 'Vote',
					data: {'adminsTotalPoints': votes.adminsTotalPoints},
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
		data: CreatePrivilegedUserDto, 
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
					userSuggested: data.uid,
					created: opt.time,
					lastUpdated: opt.time
				}
				const {entity, history} = await this.db.createVotesEntity(voteEntity, opt);
				await this.db.insert([entity, history]);
				return {'status': 'created'}
			} else if(role == 'moderator'){
				// Only 60% of approval points needed for this motion to succeed
				const approvalPoints = ((totalAdmins*10)+(totalCurators*5)+(totalModerators*2))*0.6
				const voteEntity: CreateVotesDto = {
					roleToAttain: 'curator',
					success: false,
					totalPointsNeeded: approvalPoints,
					adminsTotalPoints: currentUser.role == 'admin' ? 10 : 0,
					curatorsTotalPoints: currentUser.role == 'curator' ? 5 : 0,
					moderatorsTotalPoints: currentUser.role == 'moderator' ? 2 : 0,
					userSuggested: data.uid,
					created: opt.time,
					lastUpdated: opt.time
				}
				const {entity, history} = await this.db.createVotesEntity(voteEntity, opt);
				await this.db.insert([entity, history]);
				return {'status': 'created'}
			} else {
				return {'status': 'unsuccessful'}
			}
		} catch{
			throw new BadRequestException('Action failed')
		}
	}
}