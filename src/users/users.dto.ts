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

	@IsEmpty()
	@IsString()
	role?: string;

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
	@IsNotEmpty()
	@IsString()
	request: string;

	@IsNotEmpty()
	@IsString()
	requestSubject: string;

	@IsNotEmpty()
	@IsString()
	notes: string;

	@IsNotEmpty()
	@IsBoolean()
	approved: false;

	@IsNotEmpty()
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
	@IsString()
	request: string;

	@IsOptional()
	@IsString()
	requestSubject: string;

	@IsOptional()
	@IsString()
	notes: string;

	@IsOptional()
	@IsBoolean()
	approved: boolean;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
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