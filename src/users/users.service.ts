import { 
	Injectable, 
	ParseFileOptions, 
	BadRequestException, 
	NotFoundException, 
	UnauthorizedException 
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';
import { UserOpt, User, VoteOpt, Votes } from './users.types';
import { 
	CreatePrivilegedUserDto,  
	UpdatePrivilegedUserDto,
	CreateVotesDto,
	UpdateVotesDto 
} from '../users/users.dto';

@Injectable()
export class UsersService {
	constructor(
		private authService: AuthService,
		private db: DatabaseService
	){}	
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
		try {
			const admins = await this.findAllAdmins()
			const totalAdmins = admins.length;
			const voteEntity: CreateVotesDto = {
				roleToAttain: 'admin',
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
		} catch{
			throw new BadRequestException('Action failed')
		}
	}

	async voteToSetAdmin(data: UpdatePrivilegedUserDto, opt: VoteOpt){
		const votesKey = this.db.key(['Vote', +opt.votesId]);
		const currentUserQuery = this.db.createQuery('User').filter('uid', '=', opt.user).limit(1);
		try {
			const [result] = await this.db.get(votesKey);
			const [userResult] = await this.db.runQuery(currentUserQuery);
			const user: User = userResult[0]
			const votes: Votes = result;
			if(user.role === 'admin'){
				votes.adminsTotalPoints = votes.adminsTotalPoints+10
				if(votes.totalPointsNeeded === votes.adminsTotalPoints){
					
				}
			}
		} catch{
			throw new BadRequestException('Action failed');
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

	async proposeCuratorVote(){}

	async voteToSetCurator(){}

	// Moderator methods
	async findAllModerators(){
		try{
			const users = await this.authService.getPrivilegedUsers('moderator');
			return users;
		} catch{
			throw new BadRequestException("Could not retrieve users");
		}
	}

	async proposeModeratorVote(){}

	async voteToSetModerator(){}

	// Journalist methods
	async findAllJournalists(){
		try{
			const users = await this.authService.getPrivilegedUsers('journalist');
			return users;
		} catch{
			throw new BadRequestException("Could not retrieve users");
		}
	}

	async applyForJournalistRole(){}

	async approveToSetJournalist(){}
}