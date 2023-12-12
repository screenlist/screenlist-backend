import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsArray
} from 'class-validator';

export class CreateContentDto {
	@IsOptional()
	@IsEmpty()
	@MaxLength(60)
	author: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	authorUid: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(150)
	headline: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(250)
	summary: string;

	@IsNotEmpty()
	@IsString()
	body: string;

	@IsOptional()
	@IsString()
	tags: string;

	@IsOptional()
	@IsEmpty()
	slug: string;

	@IsOptional()
	@IsEmpty()
	type: string;
	
	@IsOptional()
	@IsDate()
	created: Date;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}

export class UpdateContentDto {
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(150)
	headline: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(250)
	summary: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	body: string;

	@IsOptional()
	@IsString()
	tags: string;

	@IsOptional()
	@IsEmpty()
	slug: string;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}