import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsNumber,
	IsDateString
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
	dateMonthFounded?: Date;

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
	@IsString()
	founder?: string;

	@IsOptional()
	@IsString()
	foundingPlace?: string;

	@IsOptional()
	@MaxLength(800)
	description: string;

	@IsOptional()
	@IsFQDN()
	website: string;
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
	@IsDateString()
	dateMonthFounded?: Date;

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
	@IsString()
	founder?: string;

	@IsOptional()
	@IsString()
	foundingPlace?: string;

	@IsOptional()
	@IsFQDN()
	website?: string;
}


// Role
export class CreateCompanyRoleDto {
	@IsNotEmpty()
	@IsString()
	@MaxLength(60)
	companyName: string;

	@IsNotEmpty()
	@IsString()
	capacity: string;
}

export class UpdateCompanyRoleDto {
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	capacity?: string;
}