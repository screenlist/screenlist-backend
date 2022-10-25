import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN
} from 'class-validator';

export class CreateCompanyDto {
	@IsString()
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

export class UpdateCompanyDto {
	@IsOptional()
	@IsString()
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


// Role
export class CreateCompanyRoleDto {
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	companyName: string;

	@IsOptional()
	@IsString()
	companyId?: string;

	@IsOptional()
	@IsString()
	ownerKind: string;

	@IsOptional()
	@IsString()
	ownerId: string;

	@IsOptional()
	@IsString()
	type: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateCompanyRoleDto {
	@IsOptional()
	@IsString()
	type?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}