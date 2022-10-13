export class CreatePrivilegedUserDto {
	uid: string;
	role: string;
	userName: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdatePrivilegedUserDto {
	uid: string;
	role: string;
	userName: string;
	lastUpdated: Date;
}

export class CreateUserInfoDto {
	userName: string;
	uid: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdateUserInfoDto {
	bio: string;
	lastUpdated: Date;
}

export class CreateVotesDto {
	roleToAttain: string;
	userSuggested: string;
	success: boolean;
	totalPointsNeeded: number;
	adminsTotalPoints: number;
	curatorsTotalPoints: number;
	moderatorsTotalPoints: number;
	created: Date;
	lastUpdated: Date;
}

export class UpdateVotesDto {
	roleToAttain: string;
	userSuggested: string;
	success: boolean;
	totalPointsNeeded: number;
	adminsTotalPoints: number;
	curatorsTotalPoints: number;
	moderatorsTotalPoints: number;
	lastUpdated: Date;
}

export class CreateRequestDto {
	request: string;
	requestSubject: string;
	notes: string;
	approved: false;
	createdBy: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdateRequestDto {
	request: string;
	requestSubject: string;
	notes: string;
	approved: boolean;
	lastUpdated: Date;
}

export class CreateJournalistInfoDto {
	description: string;
	url: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdateJournalistInfoDto {
	description: string;
	url: string;
	lastUpdated: Date;
}