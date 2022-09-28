import { 
	FilmDetails, 
	Poster, 
	Still, 
	PersonRole, 
	Person,
	Link,
	Platform,
	FilmType
} from '../films/films.types';

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