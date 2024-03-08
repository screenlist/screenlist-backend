import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsNumber,
	IsBoolean,
	IsArray
} from 'class-validator';

export class CreatePersonDto {
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	name: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	occupation: string;

	@IsOptional()
	@IsString()
	cityOfOrigin?: string;

	@IsOptional()
	@IsString()
	provinceOfOrigin?: string;

	@IsOptional()
	@IsString()
	countryOfOrigin?: string;

	@IsOptional()
	@IsNumber()
	yearOfBirth?: number;

	@IsOptional()
	@IsString()
	dateMonthOfBirth?: string;

	@IsOptional()
	@IsDate()
	deathDate?: Date;

	@IsOptional()
	@IsArray()
	nationality?: string[];

	@IsOptional()
	@IsString()
	gender?: string;

	@IsOptional()
	@IsString()
	pronouns?: string;

	@IsOptional()
	@IsString()
	@MaxLength(15)
	twitterUsername: string;

	@IsOptional()
	@IsString()
	@MaxLength(30)
	instagramUsername: string;

	@IsOptional()
	@MaxLength(800)
	description: string;

	@IsOptional()
	@IsFQDN()
	website: string;
}

export class UpdatePersonDto {
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	name?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	occupation?: string;

	@IsOptional()
	@IsString()
	cityOfOrigin?: string;

	@IsOptional()
	@IsString()
	provinceOfOrigin?: string;

	@IsOptional()
	@IsString()
	countryOfOrigin?: string;

	@IsOptional()
	@IsNumber()
	yearOfBirth?: number;

	@IsOptional()
	@IsString()
	dateMonthOfBirth?: string;

	@IsOptional()
	@IsDate()
	deathDate?: Date;

	@IsOptional()
	@IsArray()
	nationality?: string[];

	@IsOptional()
	@IsString()
	gender?: string;

	@IsOptional()
	@IsString()
	pronouns?: string;

	@IsOptional()
	@MaxLength(800)
	description?: string;

	@IsOptional()
	@IsFQDN()
	website?: string;

	@IsOptional()
	@IsString()
	@MaxLength(15)
	twitterUsername?: string;

	@IsOptional()
	@IsString()
	@MaxLength(30)
	instagramUsername?: string;
}

export class CreatePersonRoleDto {
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	personName: string;

	@IsOptional()
	@IsString()
	personId?: string;

	@IsOptional()
	@IsString()
	ownerKind?: string;

	@IsOptional()
	@IsString()
	ownerId: string;

	@IsNotEmpty()
	@MaxLength(30)
	title: string;

	@IsNotEmpty()
	@MaxLength(20)
	department: string;

	@IsNotEmpty()
	@MaxLength(20)
	category: string;

	@IsOptional()
	@IsString()
	@MaxLength(60)
	characterName?: string;

	@IsOptional()
	@MaxLength(150)
	characterDescription?: string;
}

export class UpdatePersonRoleDto {
	@IsOptional()
	@MaxLength(30)
	title?: string;

	@IsOptional()
	@MaxLength(20)
	department?: string;

	@IsOptional()
	@MaxLength(20)
	category?: string;

	@IsOptional()
	@MaxLength(60)
	characterName?: string;

	@IsOptional()
	@MaxLength(150)
	characterDescription?: string;
}