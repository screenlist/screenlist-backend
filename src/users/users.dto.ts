import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsNumber,
	IsBoolean
} from 'class-validator';

export class CreateUserDto {
	@IsOptional()
	@IsEmpty()
	@IsString()
	uid: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(20)
	userName: string;

	@IsOptional()
	@MaxLength(200)
	bio?: string;

	@IsOptional()
	@IsString()
	role: string;

	@IsOptional()
	@IsEmpty()
	@IsNumber()
	mailId?: number;


	@IsOptional()
	@IsString()
	displayName?: string;

	@IsOptional()
	@IsString()
	publication?: string;

	@IsOptional()
	@IsDate()
	created: Date;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class UpdateUserDto {
	@IsOptional()
	@MaxLength(20)
	userName?: string;

	@IsOptional()
	@MaxLength(200)
	bio?: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	role?: string;

	@IsOptional()
	@IsEmpty()
	@IsNumber()
	mailId?: number;

	@IsOptional()
	@IsString()
	displayName?: string;

	@IsOptional()
	@IsString()
	publication?: string;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class CreateVotesDto {
	@IsNotEmpty()
	@IsString()
	roleToAttain: string;

	@IsNotEmpty()
	@IsString()
	userSuggested: string;

	@IsNotEmpty()
	@IsBoolean()
	success: boolean;

	@IsNotEmpty()
	@IsNumber()
	totalPointsNeeded: number;

	@IsNotEmpty()
	@IsNumber()
	adminsTotalPoints: number;

	@IsNotEmpty()
	@IsNumber()
	curatorsTotalPoints: number;

	@IsNotEmpty()
	@IsNumber()
	moderatorsTotalPoints: number;

	@IsOptional()
	@IsDate()
	created: Date;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class UpdateVotesDto {
	@IsOptional()
	@IsString()
	roleToAttain: string;

	@IsOptional()
	@IsString()
	userSuggested: string;

	@IsOptional()
	@IsBoolean()
	success: boolean;

	@IsOptional()
	@IsNumber()
	totalPointsNeeded: number;

	@IsOptional()
	@IsNumber()
	adminsTotalPoints: number;

	@IsOptional()
	@IsNumber()
	curatorsTotalPoints: number;

	@IsOptional()
	@IsNumber()
	moderatorsTotalPoints: number;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class CreateRequestDto {
	@IsOptional()
	@IsEmpty()
	@IsString()
	request: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	requestSubject: string;

	@IsNotEmpty()
	@IsString()
	notes: string;

	@IsOptional()
	@IsEmpty()
	@IsBoolean()
	approved: boolean;

	@IsOptional()
	@IsEmpty()
	@IsBoolean()
	acknowledged: boolean;

	@IsOptional()
	@IsEmpty()
	@IsString()
	createdBy: string;

	@IsOptional()
	@IsDate()
	created: Date;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class UpdateRequestDto {
	@IsOptional()
	@IsEmpty()
	@IsString()
	request?: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	requestSubject?: string;

	@IsOptional()
	@IsString()
	notes?: string;

	@IsOptional()
	@IsEmpty()
	@IsBoolean()
	approved?: boolean;

	@IsOptional()
	@IsEmpty()
	@IsBoolean()
	acknowledged?: boolean;

	@IsOptional()
	@IsEmpty()
	@IsDate()
	lastUpdated?: Date;
}

export class CreateJournalistInfoDto {
	@IsOptional()
	@IsString()
	description: string;

	@IsOptional()
	@IsString()
	url: string;

	@IsOptional()
	@IsDate()
	created: Date;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class UpdateJournalistInfoDto {
	@IsOptional()
	@IsString()
	description: string;

	@IsOptional()
	@IsString()
	url: string;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}