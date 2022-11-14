import { 
	Controller, 
	UseGuards,
	Get,
	Post,
	Put,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	Headers,
	UploadedFile,
	UseInterceptors,
	BadRequestException,
	NotFoundException
} from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import { UserOpt, VoteOpt, RequestOpt} from './users.types';
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
import { UsersService } from './users.service';
import { ImageOpt } from '../films/films.types';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
	constructor(
		private authService: AuthService,
		private usersService: UsersService
	){}

	@Get()
	async findAllUsers(){
		return await this.usersService.findAllUsers()
	}

	@Get('search')
	async searchUsername(@Query('q') username: string){
		console.log('searchUsername')
		return await this.usersService.checkUserName(username)
	}

	// Check for existing userName
	@Get('check')
	async checkExisitingUser(
		@Query('username') userName: string
	){
		console.log('checkExisitingUser')
		return await this.usersService.checkUserName(userName);
	}

	// Similar the authenticateOne method except for the http verb and the latter
	// returns only a userName
	@Get(':userName')
	async findOne(@Param('userName') userName: string){
		console.log('findOne')
		return await this.usersService.findUserByUsername(userName);
	}

	@Get('admins')
	async findAdmins(){
		console.log('findAdmins')
		return await this.usersService.findAllAdmins();
	}

	@Get('curators')
	async findCurators(){
		console.log('findCurators')
		return await this.usersService.findAllCurators();
	}

	@Get('moderators')
	async findModerators(){
		console.log('findModerators')
		return await this.usersService.findAllModerators();
	}

	@Get('journalists')
	async findJournalists(){
		console.log('findJournalists')
		return await this.usersService.findAllJournalists();
	}
	

	// Every user uses this route to get register more profile infomation
	@Post('register')
	async setupUser(
		@Body() createUserDto: CreateUserDto,
		@Headers('AuthorizationToken') idToken: string
	){
		console.log('setupUser', createUserDto, idToken.slice(0,10))
		try{
			const userOptions: UserOpt = {
				user: await this.authService.getUserUid(idToken),
				time: new Date()
			}
			const create = await this.usersService.createUser(createUserDto, userOptions);
			return create
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}


	@Post('auth')
	async authenticateOne(
		@Headers('AuthorizationToken') idToken: string
	){
		console.log('authenticateOne')
		const user = await this.authService.getUserUid(idToken);
		return await this.usersService.getUserName(user);
	}

	// Routes for updating user information
	@Patch(':userName')
	@Roles('member')
	async updateUser(
		@Param('userName') userName: string,
		@Body() updateUserDto: UpdateUserDto,
		@Headers('AuthorizationToken') idToken: string
	){
		console.log('updateUser')
		const userOptions: UserOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			userName: userName
		}
		return await this.usersService.updateUser(updateUserDto, userOptions);
	}

	@Delete('delete')
	@Roles('member')
	async deleteAcount(@Headers('AuthorizationToken') idToken: string){
		const uid = await this.authService.getUserUid(idToken);
		return await this.usersService.deleteUser(uid);
	}

	@Post(':userName/photo')
	@Roles('member')
	@UseInterceptors(FileInterceptor('profile'))
	async updateUserPhoto(
		@Param('userName') userName: string,
		@Headers('AuthorizationToken') idToken: string,
		@UploadedFile() profile: Express.Multer.File
	){
		console.log('updateUserPhoto')
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: await this.authService.getUserUid(idToken),
			parentKind: 'User'
		}
		return await this.usersService.uploadProfilePhoto(imageOptions, profile);
	}

	@Delete(':userName/photo')
	@Roles('member')
	async deleteUserPhoto(
		@Headers('AuthorizationToken') idToken: string,
		@Query('image_name') imageName: string
	){
		console.log('deleteUserPhoto')
		const user = await this.authService.getUserUid(idToken);
		return await this.usersService.removeProfilePhoto(imageName, user);
	}

	// Admins use this route to view all requests for the journalism role
	@Get('admin/journalists/requests')
	@Roles('admin')
	async findJournalistRequests(){
		console.log('findJournalistRequests')
		return await this.usersService.findAllJournalistRequests();
	}

	// Admins us this route to approve journalists
	@Post('admin/journalists/requests/:requestId')
	@Roles('admin')
	async approveJournalist(
		@Param('username') userName: string,
		@Param('requestId') requestId: string,
		@Body() updateRequestDto: UpdateRequestDto,
		@Headers('AuthorizationToken') idToken: string
	){
		console.log('approveJournalist')
		const requestOptions: RequestOpt = {
			userName: userName,
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			requestId: requestId
		}
		return await this.usersService.approveToSetJournalist(updateRequestDto, requestOptions);
	}

	// Users use this route to request the journalist role
	@Post('journalists/requests')
	@Roles('journalist')
	async requestJournalistRole(
		@Query('username') userName: string,
		@Body() createRequestDto: CreateRequestDto,
		@Headers('AuthorizationToken') idToken: string
	){
		console.log('requestJournalistRole')
		const requestOptions: RequestOpt = {
			userName: userName,
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.usersService.applyForJournalistRole(createRequestDto, requestOptions);
	}

	// Admins use this route to remove curators and moderators from their roles
	@Post('super/remove')
	@Roles('admin')
	async revokeSuperRole(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') subjectUid: string
	){
		console.log('revokeSuperRole')
		const userOptions: UserOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.usersService.revokePrivilegedRole(subjectUid, userOptions);
	}

	// Routes for proposing role votes
	@Post('votes/admins')
	@Roles('admin')
	async proposeVoteForAdmin(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Query('vote_for') voteFor: string
	){
		console.log('proposeVoteForAdmin')
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			userToVoteFor: voteFor
		}
		return await this.usersService.proposeAdminVote(voteOptions);
	}

	@Post('votes/curators')
	@Roles('admin')
	async proposeVoteForCurator(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Query('vote_for') voteFor: string
	){
		console.log('proposeVoteForCurator')
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			userToVoteFor: voteFor
		}
		return await this.usersService.proposeCuratorVote(voteOptions);
	}

	@Post('votes/moderators')
	@Roles('moderator')
	async proposeVoteForModerator(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Query('vote_for') voteFor: string
	){
		console.log('proposeVoteForModerator')
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			userToVoteFor: voteFor
		}
		return await this.usersService.proposeModeratorVote(voteOptions);
	}

	// Routes for role voting
	@Post('votes/:votesId/admins')
	@Roles('admin')
	async voteForAdmin(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Param('votesId') votesId: string,
		@Query('vote_for') voteFor: string
	){
		console.log('voteForAdmin')
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			votesId: votesId,
			userToVoteFor: voteFor
		}
		return await this.usersService.voteToSetAdmin(voteOptions);
	}

	@Post('votes/:votesId/curators')
	@Roles('admin')
	async voteForCurator(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Param('votesId') votesId: string,
		@Query('vote_for') voteFor: string
	){
		console.log('voteForCurator')
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			votesId: votesId,
			userToVoteFor: voteFor
		}
		return await this.usersService.voteToSetCurator(voteOptions);
	}

	@Post('votes/:votesId/moderators')
	@Roles('moderator')
	async voteForModerator(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Param('votesId') votesId: string,
		@Query('vote_for') voteFor: string
	){
		console.log('voteForModerator')
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			votesId: votesId,
			userToVoteFor: voteFor
		}
		return await this.usersService.voteToSetModerator(voteOptions);
	}
}
