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
	tags: string[];

	@IsOptional()
	@IsEmpty()
	slug: string;
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
}