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
	IsArray,
	ArrayMinSize
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
	dateMonthOfBirth?: Date;

	@IsOptional()
	@IsDate()
	deathDate?: Date;

	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	@IsString({ each: true }) 
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
	dateMonthOfBirth?: Date;

	@IsOptional()
	@IsDate()
	deathDate?: Date;

	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	@IsString({ each: true }) 
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
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	characterName?: string;
}

export class UpdatePersonRoleDto {
	@IsOptional()
	@IsNotEmpty()
	@MaxLength(30)
	title?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(20)
	department?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(20)
	category?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(60)
	characterName?: string;
}