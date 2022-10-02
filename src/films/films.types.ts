import {
	Company,
	CompanyRole
} from '../companies/companies.types';
import {
	PersonRole, 
	Person,
} from '../people/people.types';
import {
	Link
} from '../platforms/platforms.types'

export interface Still {
	id
	originalName: string;
	description: string;
	url: string;
	quality: string;
	film: string;
	lastUpdated: Date;
	created: Date;
}

export interface Poster {
	id
	originalName: string;
	description: string;
	url: string;
	quality: string;
	film: string;
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

// Utility
export interface ImageOpt {
	imageId?: string,
	time: Date,
	parentId: string,
	parentKind: string,
	user: string
}