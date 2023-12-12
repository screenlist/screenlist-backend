import {
	Company,
	CompanyRole
} from '../companies/companies.types';
import {
	PersonRole, 
	Person,
} from '../people/people.types';

export interface Still {
	id: string;
	stillIndex: number;
	originalUrl?: string;
	originalName?: string;
	originalDimensions?: string;
	originalSize?: string;
	hdUrl?: string;
	hdName?: string;
	hdDimensions?: string;
	hdSize?: number;
	sdUrl?: string;
	sdName?: string;
	sdDinemsions?: string;
	sdSize?: number
	lqUrl?: string;
	lqName?: string;
	lqDinemsions?: string;
	lqSize?: number;
	attribution: string;
	lastUpdated: Date;
	created: Date;
}

export interface Poster {
	id: string;
	posterIndex: number;
	originalUrl?: string;
	originalName?: string;
	originalDimensions?: string;
	originalSize?: string;
	hdUrl?: string;
	hdName?: string;
	hdDimensions?: string;
	hdSize?: number;
	sdUrl?: string;
	sdName?: string;
	sdDinemsions?: string;
	sdSize?: number
	lqUrl?: string;
	lqName?: string;
	lqDinemsions?: string;
	lqSize?: number;
	attribution: string;
	lastUpdated: Date;
	created: Date;
}

export interface Film {
	id: string;
	name: string;
	trailerUrl?: string;
	type: string;
	format: string;
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
	details: Film;
	posters?: Poster[];
	stills?: Still[];
	actors?: PersonRole[];
	crew?: PersonRole[];
	distributors?: CompanyRole[];
	producers?: CompanyRole[]
}

// Utility
export interface ImageOpt {
	imageId: string,
	time: Date,
	parentId: string,
	parentKind: string,
	user: string
}

export interface RatingOpt {
	ratingId?: string,
	time: Date,
	parentId: string,
	parentKind: string,
	user: string
}