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

	@IsOptional()
	@IsEmpty()
	profilePhotoUrl: string;

	@IsOptional()
	@IsEmpty()
	profilePhotoOriginalName: string;

	@MaxLength(500)
	description: string;

	@IsOptional()
	@IsFQDN()
	website: string;

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

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

	@IsOptional()
	@IsEmpty()
	profilePhotoUrl?: string;

	@IsOptional()
	@IsEmpty()
	profilePhotoOriginalName?: string;

	@IsOptional()
	@MaxLength(500)
	description?: string;

	@IsOptional()
	@IsFQDN()
	website?: string;

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

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

	@IsNotEmpty()
	@IsString()
	type: string;

	@IsOptional()
	@IsEmpty()
	editVerified: boolean;

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
	@IsEmpty()
	editVerified?: boolean;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}