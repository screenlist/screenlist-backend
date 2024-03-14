import { 
	Controller, 
	UseGuards,
	Get,
	Post,
	Patch,
	Body,
	Param,
	Query,
	Headers
} from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { AuthService } from '../auth/auth.service';
import { UserOpt, RequestOpt} from './users.types';
import { 
	UpdateUserDto,
	CreateRequestDto,
} from '../users/users.dto';
import { UsersService } from './users.service';
import { WebhookEvent } from '@clerk/clerk-sdk-node';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
	constructor(
		private authService: AuthService,
		private usersService: UsersService
	){}

	@Get()
	@Roles('admin')
	async findAllUsers(){
		return await this.usersService.findAllUsers()
	}

	@Get('admins')
	@Roles('admin')
	async findAdmins(){
		console.log('findAdmins')
		return await this.usersService.findAllAdmins();
	}

	@Get('curators')
	@Roles('admin')
	async findCurators(){
		console.log('findCurators')
		return await this.usersService.findAllCurators();
	}

	@Get('moderators')
	@Roles('admin')
	async findModerators(){
		console.log('findModerators')
		return await this.usersService.findAllModerators();
	}

	@Get('journalists')
	@Roles('admin')
	async findJournalists(){
		console.log('findJournalists')
		return await this.usersService.findAllJournalists();
	}

	// Routes for updating user information
	@Get('u/:userName')
	async findOne(@Param('userName') userName: string){
		console.log('findOne')
		return await this.usersService.findUserByUsername(userName);
	}

	@Patch('u/:userName')
	@Roles('member')
	async updateUser(
		@Param('userName') userName: string,
		@Body() updateUserDto: UpdateUserDto,
		@Headers('x-user-id') userId: string
	){
		console.log('updateUser')
		const userOptions: UserOpt = {
			user: userId,
			time: new Date(),
			userName: userName
		}
		return await this.usersService.updateUser(updateUserDto, userOptions);
	}

	@Get('details')
	@Roles('member')
	async userDetailsOnly(@Headers('x-user-id') userId: string){
		return await this.usersService.findDetailsOnly(userId)
	}

	@Get('quota')
	@Roles('member')
	async getQuota(@Headers('x-user-id') userId: string){
		return await this.usersService.getMemberQuotaUsage(userId)
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
		@Headers('x-user-id') userId: string
	){
		console.log('approveJournalist')
		const requestOptions: RequestOpt = {
			userName: userName,
			user: userId,
			time: new Date(),
			requestId: requestId
		}
		return await this.usersService.approveToSetJournalist(requestOptions);
	}

	@Patch('admin/journalists/requests/:requestId/reject')
	@Roles('admin')
	async rejectJournalist(
		@Param('username') userName: string,
		@Param('requestId') requestId: string,
		@Headers('x-user-id') userId: string
	){
		console.log('rejectJournalist')
		const requestOptions: RequestOpt = {
			userName: userName,
			user: userId,
			time: new Date(),
			requestId: requestId
		}
		return await this.usersService.rejectToSetJournalist(requestOptions);
	}

	// Users use this route to request the journalist role
	@Post('journalists/requests')
	@Roles('member')
	async requestJournalistRole(
		@Query('username') userName: string,
		@Body() createRequestDto: CreateRequestDto,
		@Headers('x-user-id') userId: string
	){
		console.log('requestJournalistRole')
		const requestOptions: RequestOpt = {
			userName: userName,
			user: userId,
			time: new Date()
		}
		return await this.usersService.applyForJournalistRole(createRequestDto, requestOptions);
	}

	// Admins use this route to remove curators and moderators from their roles
	@Post('super/remove')
	@Roles('admin')
	async revokeSuperRole(
		@Headers('x-user-id') userId: string,
		@Query('username') subjectUid: string
	){
		console.log('revokeSuperRole')
		const userOptions: UserOpt = {
			user: userId,
			time: new Date()
		}
		return await this.usersService.revokePrivilegedRole(subjectUid);
	}

	@Post('super/admin')
	@Roles('admin')
	async makeAdmin(
		@Headers('x-user-id') userId: string,
		@Query('username') uid: string
	){
		const userOptions: UserOpt = {
			user: userId,
			time: new Date()
		}
		return await this.usersService.makeAdmin(uid, userOptions);
	}

	@Post('super/curator')
	@Roles('admin')
	async makeCurator(
		@Headers('x-user-id') userId: string,
		@Query('username') uid: string
	){
		const userOptions: UserOpt = {
			user: userId,
			time: new Date()
		}
		return await this.usersService.makeCurator(uid, userOptions);
	}

	@Post('super/moderator')
	@Roles('admin')
	async makeModerator(
		@Headers('x-user-id') userId: string,
		@Query('username') uid: string
	){
		const userOptions: UserOpt = {
			user: userId,
			time: new Date()
		}
		return await this.usersService.makeModerator(uid, userOptions);
	}

	@Post('webhooks')
	async processWebhooks(@Body() event: WebhookEvent){
		return await this.processWebhooks(event)
	}
}