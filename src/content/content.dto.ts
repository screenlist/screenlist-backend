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
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	author: string;

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
	@IsArray()
	tags: [{
		kind: string,
		id: string,
		displayName: string
	}];

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
	@MaxLength(60)
	author: string;

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
	@IsArray()
	tags: [{
		kind: string,
		id: string,
		displayName: string
	}];

	@IsOptional()
	@IsEmpty()
	slug: string;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;
}