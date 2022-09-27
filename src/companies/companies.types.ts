export interface Company {
	id: string;
	name: string;
	nameEditable: boolean;
	profilePhotoUrl?: string;
	profilePhotoOriginalName?: string;
	website?: string;
	lastUpdated: Date;
	created: Date;
}

export interface CompanyRole {
	id: string;
	film: string;
	companyName: string;
	companyId?: string;
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
	seriesDistribution: CompanyRole[];
}