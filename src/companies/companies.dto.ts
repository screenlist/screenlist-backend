export class CreateCompanyDto {
	name: string;
	profilePhotoUrl: string;
	profilePhotoOriginalName: string;
	website: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdateCompanyDto {
	name?: string;
	profilePhotoUrl?: string;
	profilePhotoOriginalName?: string;
	website?: string;
	created?: Date;
	lastUpdated?: Date;
}


// Role
export class CreateCompanyRoleDto {
	companyName: string;
	website?: string;
	ownerKind: string;
	ownerId: string;
	type: string;
	lastUpdated?: Date;
	created?: Date;
}

export class UpdateCompanyRoleDto {
	companyName?: string;
	website?: string;
	type?: string;
	lastUpdated?: Date;
	created?: Date;
}