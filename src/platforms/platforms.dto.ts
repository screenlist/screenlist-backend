import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN
} from 'class-validator';

export class CreatePlatformDto {
	@IsNotEmpty()
	@MaxLength(60)
	name: string;

	@IsEmpty()
	profilePhotoUrl: string;

	@IsEmpty()
	profilePhotoOriginalName: string;

	@MaxLength(500)
	description: string;

	@IsFQDN()
	website: string;

	@IsOptional()
	@IsDate()
	created: Date;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class UpdatePlatformDto {
	@IsOptional()
	@MaxLength(60)
	name?: string;

	@IsEmpty()
	profilePhotoUrl?: string;

	@IsEmpty()
	profilePhotoOriginalName?: string;

	@IsOptional()
	@MaxLength(500)
	description?: string;

	@IsOptional()
	@IsFQDN()
	website?: string;

	@IsOptional()
	@IsDate()
	created?: Date;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}

export class CreateLinkDto {
	@IsNotEmpty()
	@IsString()
	accessType: string;

	@IsNotEmpty()
	@IsString()
	url: string;

	@IsNotEmpty()
	@IsString()
	platformName: string;

	@IsOptional()
	@IsString()
	platformId: string;

	@IsOptional()
	@IsString()
	ownerKind: string;

	@IsOptional()
	@IsString()
	ownerId: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateLinkDto {
	@IsOptional()
	@IsString()
	accessType?: string;

	@IsOptional()
	@IsString()
	url?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}