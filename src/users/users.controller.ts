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
	UseInterceptors 
} from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HistoryOpt } from '../database/database.types';
import { AuthService } from '../auth/auth.service';
import { UserOpt, VoteOpt, RequestOpt} from './users.types';
import { 
	CreatePrivilegedUserDto,  
	UpdatePrivilegedUserDto,
	CreateVotesDto,
	UpdateVotesDto,
	CreateRequestDto,
	UpdateRequestDto,
	CreateJournalistInfoDto,
	UpdateJournalistInfoDto,
	CreateUserInfoDto,
	UpdateUserInfoDto
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

	@Get(':userName')
	@Roles('member')
	async findOne(
		@Param('userName') userName: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.usersService.findUserInfo(userName, user);
	}

	@Get('admins')
	async findAdmins(){
		return await this.usersService.findAllAdmins();
	}

	@Get('curators')
	async findCurators(){
		return await this.usersService.findAllCurators();
	}

	@Get('moderators')
	async findModerators(){
		return await this.usersService.findAllModerators();
	}

	@Get('journalists')
	async findJournalists(){
		return await this.usersService.findAllJournalists();
	}
	// Check for existing userName
	@Get('check')
	async checkExisitingUser(
		@Query('username') userName: string
	){
		return await this.usersService.checkUserName(userName);
	}

	// Every user uses this route to get register more profile infomation
	@Post('setup')
	async setupUser(
		@Body() createUserInfoDto: CreateUserInfoDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const userOptions: UserOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.usersService.createUser(createUserInfoDto, userOptions);
	}

	// Routes for updating user information
	@Post(':userName')
	@Roles('member')
	async updateUserInfo(
		@Param('userName') userName: string,
		@Body() updateUserInfoDto: UpdateUserInfoDto,
		@Headers('AuthorizationToken') idToken: string
	){
		const userOptions: UserOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			userName: userName
		}
		return await this.usersService.updateUser(updateUserInfoDto, userOptions);
	}

	@Post(':userName/photo')
	@Roles('member')
	@UseInterceptors(FileInterceptor('profile'))
	async updateUserPhoto(
		@Param('userName') userName: string,
		@Headers('AuthorizationToken') idToken: string,
		@UploadedFile() profile: Express.Multer.File
	){
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: await this.authService.getUserUid(idToken),
			parentKind: 'UserInfo'
		}
		return await this.usersService.uploadProfilePhoto(imageOptions, profile);
	}

	@Delete(':userName/photo')
	@Roles('member')
	async deleteUserPhoto(
		@Headers('AuthorizationToken') idToken: string,
		@Query('image_name') imageName: string
	){
		const user = await this.authService.getUserUid(idToken);
		return await this.usersService.removeProfilePhoto(imageName, user);
	}

	// Admins use this route to view all requests for the journalism role
	@Get('admin/journalists/requests')
	@Roles('admin')
	async findJournalistRequests(){
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
		@Body() createPrivilegedUserDto: CreatePrivilegedUserDto
	){
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date()
		}
		return await this.usersService.proposeAdminVote(createPrivilegedUserDto, voteOptions);
	}

	@Post('votes/curators')
	@Roles('admin')
	async proposeVoteForCurator(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Body() createPrivilegedUserDto: CreatePrivilegedUserDto
	){
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date()
		}
		return await this.usersService.proposeCuratorVote(createPrivilegedUserDto, voteOptions);
	}

	@Post('votes/moderators')
	@Roles('moderator')
	async proposeVoteForModerators(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Body() createPrivilegedUserDto: CreatePrivilegedUserDto
	){
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date()
		}
		return await this.usersService.proposeModeratorVote(createPrivilegedUserDto, voteOptions);
	}

	// Routes for role voting
	@Post('votes/:votesId/admins')
	@Roles('admin')
	async voteForAdmin(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Param('votesId') votesId: string,
		@Body() CreatePrivilegedUserDto: CreatePrivilegedUserDto
	){
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			votesId: votesId
		}
		return await this.usersService.voteToSetAdmin(CreatePrivilegedUserDto, voteOptions);
	}

	@Post('votes/:votesId/curators')
	@Roles('admin')
	async voteForCurator(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Param('votesId') votesId: string,
		@Body() CreatePrivilegedUserDto: CreatePrivilegedUserDto
	){
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			votesId: votesId
		}
		return await this.usersService.voteToSetCurator(CreatePrivilegedUserDto, voteOptions);
	}

	@Post('votes/:votesId/moderators')
	@Roles('moderator')
	async voteForModerator(
		@Headers('AuthorizationToken') idToken: string,
		@Query('username') userName: string,
		@Param('votesId') votesId: string,
		@Body() CreatePrivilegedUserDto: CreatePrivilegedUserDto
	){
		const voteOptions: VoteOpt = {
			user: await this.authService.getUserUid(idToken),
			userName: userName,
			time: new Date(),
			votesId: votesId
		}
		return await this.usersService.voteToSetModerator(CreatePrivilegedUserDto, voteOptions);
	}
}
