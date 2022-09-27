export class CreateCompanyDto {
	name: string;
	nameEditable: string;
	profilePhotoUrl: string;
	profilePhotoOriginalName: string;
	website: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdateCompanyDto {
	id: string;
	name?: string;
	nameEditable?: string;
	profilePhotoUrl?: string;
	profilePhotoOriginalName?: string;
	website?: string;
	created?: Date;
	lastUpdated?: Date;
}


// Role
export class CreateCompanyRoleDto {
	companyName: string;
	companyId?: number;
	website?: string;
	type: string;
	lastUpdated?: Date;
	created?: Date;
}

export class UpdateCompanyRoleDto {
	id: number;
	companyName?: string;
	companyId?: number;
	website?: string;
	type?: string;
	lastUpdated?: Date;
	created?: Date;
}