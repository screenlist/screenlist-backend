import {
	Company,
	CompanyRole
} from '../companies/companies.types';

export interface Still {
	originalName: string;
	description: string;
	url: string;
	quality: string;
	film: string;
	lastUpdated: Date;
	created: Date;
}

export interface Poster {
	originalName: string;
	description: string;
	url: string;
	quality: string;
	film: string;
	lastUpdated: Date;
	created: Date;
}

export interface PersonRole {
	id: string;
	personName: string;
	personId?: string;
	ownerKind: string;
	title: string;
	subtitle: string;
	category: string;
	characterName?: string;
	characterDescription?: string;
	lastUpdated: Date;
	created: Date;
}

export interface Person {
	id: string;
	name: string;
	nameEditable: boolean;
	lastUpdated: Date;
	created: Date;
}

export interface Platform {
	id: string;
	name: string;
	nameEditable: boolean;
	website?: string;
	lastUpdated: Date;
	created: Date;
}

export interface Link {
	id: string;
	accessType: string;
	url: string;
	platformName: string;
	platformId?: string;
	ownerKind: string;
	lastUpdated: Date;
	created: Date;
}

export interface FilmDetails {
	id: string;
	name: string;
	nameEditable: boolean;
	trailerUrl?: string;
	type: string;
	productionStage: string;
	runtime?: number;
	logline: string;
	plotSummary?: string;
	releaseDate?: Date;
	initialPlatform?: string;
	genres?: [string];
	slug: string;
	lastUpdated: Date;
	created: Date;
}

export interface FilmType {
	details: FilmDetails;
	posters?: Poster[];
	stills?: Still[];
	actors?: PersonRole[];
	crew?: PersonRole[];
	platforms?: Link[];
	distributors?: CompanyRole[];
	producers?: CompanyRole[]
}