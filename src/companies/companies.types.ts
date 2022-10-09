export interface Company {
	id: string,
	name: string,
	profilePhotoUrl?: string,
	profilePhotoOriginalName?: string,
	description: string,
	website?: string,
	lastUpdated: Date,
	created: Date
}

export interface CompanyRole {
	id: string;
	companyName: string;
	companyId?: string;
	ownerName: string;
	year?: string;
	type: string;
	website?: string;
	lastUpdated: Date;
	created: Date;
}

export interface CompanyType {
	details: Company;
	filmProduction: CompanyRole[];
	seriesProduction: CompanyRole[];
	filmDistribution: CompanyRole[];
}

// Utility
export interface CompanyRoleOpt {
	companyId: string,
	roleId?: string,
	time: Date,
	parentId: string,
	parentKind: string,
	user: string
}

export interface CompanyOpt {
	time: Date,
	user: string,
	companyId?: string
}