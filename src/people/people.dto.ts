import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsNumber,
	IsBoolean
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
	lastUpdated?: Date;
}

// export class PersonDraftDto {
// 	@IsOptional()
// 	@IsString()
// 	@MaxLength(60)
// 	name?: string;

// 	@IsOptional()
// 	@IsString()
// 	@MaxLength(60)
// 	occupation?: string;

// 	@IsEmpty()
// 	profilePhotoUrl?: string;

// 	@IsEmpty()
// 	profilePhotoOriginalName?: string;

// 	@IsOptional()
// 	@MaxLength(500)
// 	description?: string;

// 	@IsOptional()
// 	@IsFQDN()
// 	website?: string;

// 	@IsOptional()
// 	@IsString()
// 	@MaxLength(15)
// 	twitterUsername?: string;

// 	@IsOptional()
// 	@IsString()
// 	@MaxLength(30)
// 	instagramUsername?: string;

// 	@IsOptional()
// 	@IsDate()
// 	created?: Date;

// 	@IsOptional()
// 	@IsString()
// 	@IsEmpty()
// 	xUserUid: string;

// 	@IsOptional()
// 	@IsBoolean()
// 	@IsEmpty()
// 	xApproved?: boolean;
// }

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

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
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

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}

// export class PersonRoleDraftDto {
// 	@IsNotEmpty()
// 	@IsString()
// 	@MaxLength(60)
// 	personName: string;

// 	@IsOptional()
// 	@IsString()
// 	personId?: string;

// 	@IsOptional()
// 	@IsString()
// 	ownerKind?: string;

// 	@IsOptional()
// 	@IsString()
// 	ownerId: string;

// 	@IsNotEmpty()
// 	@MaxLength(30)
// 	title: string;

// 	@IsNotEmpty()
// 	@MaxLength(20)
// 	department: string;

// 	@IsNotEmpty()
// 	@MaxLength(20)
// 	category: string;

// 	@IsOptional()
// 	@IsString()
// 	@MaxLength(60)
// 	characterName?: string;

// 	@IsOptional()
// 	@MaxLength(150)
// 	characterDescription?: string;

// 	@IsOptional()
// 	@IsDate()
// 	created?: Date;

// 	@IsOptional()
// 	@IsString()
// 	xUserUid: string;

// 	@IsOptional()
// 	@IsString()
// 	xKind: string;

// 	@IsOptional()
// 	@IsBoolean()
// 	@IsEmpty()
// 	xApproved?: boolean;
// }