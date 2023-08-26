import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsNumber
} from 'class-validator';

export class CreateCompanyDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(60)
	name: string;

	@IsOptional()
	@IsNumber()
	founded?: number;

	@IsOptional()
	@IsString()
	city?: string;

	@IsOptional()
	@IsString()
	country?: string;

	@IsOptional()
	@IsString()
	director?: string;

	@IsOptional()
	@MaxLength(800)
	description: string;

	@IsOptional()
	@IsFQDN()
	website: string;

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

	@IsOptional()
	@IsEmpty()
	isHidden?: boolean;

	@IsOptional()
	@IsEmpty()
	editLocked?: boolean;

	@IsOptional()
	@IsEmpty()
	@IsDate()
	lastVerified?: Date;

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
	@IsNotEmpty()
	@MaxLength(60)
	name?: string;

	@IsOptional()
	@IsNumber()
	founded?: number;

	@IsOptional()
	@IsString()
	city?: string;

	@IsOptional()
	@IsString()
	country?: string;

	@IsOptional()
	@IsString()
	director?: string;

	@IsOptional()
	@MaxLength(800)
	description?: string;

	@IsOptional()
	@IsFQDN()
	website?: string;

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

	@IsOptional()
	@IsEmpty()
	isHidden?: boolean;

	@IsOptional()
	@IsEmpty()
	editLocked?: boolean;

	@IsOptional()
	@IsEmpty()
	@IsDate()
	lastVerified?: Date;

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
	@IsNotEmpty()
	@IsString()
	type: string;


	@IsNotEmpty()
	@IsString()
	capacity: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateCompanyRoleDto {
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	type?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	capacity?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}