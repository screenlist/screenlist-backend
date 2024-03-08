import { Collection } from 'src/database/database.types';

export interface Film {
	id: string;
	name: string;
	year: number;
	trailerUrl?: string;
	type: string;
	format: string;
	productionStage: string;
	runtime?: number;
	boxOffice?: number;
	budget?: number;
	logline: string;
	plotSummary?: string;
	releaseDate?: Date;
	initialPlatform?: string;
	countries?: [string];
	languages?: [string];
	additionalLanguages?: string;
	genres: [string];
	listRatings: number;
	listScore: number;
	hasPoster: boolean;
	isHidden: boolean;
	editVerified: boolean;
	editLocked: boolean;
	lastVerified: Date;
	lastUpdated: Date;
	created: Date;
}

export interface Photo {
	id: string;
	type: 'still' | 'poster' | 'image'
	photoIndex: number;
	parentId: string;
	parentCollection: 'films' | 'people' | 'content' | 'users' | 'companies';
	originalUrl: string;
	originalName: string;
	originalDimensions: string;
	originalSize: number;
	optimisedUrl: string;
	optimisedName: string;
	optimisedDimensions: string;
	optimisedSize: number;
	uploadedByUser: string;
	attribution?: string;
	description?: string;
	lastUpdated?: Date;
	created?: Date;
}

export interface Rating {
	id: string;
	authorUid: string;
	parentId: string;
	parentKind: 'films';
	verdict: string;
	listRating: 'u' | 'n' | 'd';
	reviewLink: string;
	editVerified: boolean;
	lastUpdated: Date;
	created: Date;
}

export interface Today {
	id: string,
	collection: 'films' | 'companies' | 'people',
	identifier: string,
	day: number,
	month: number,
	year: number,
	created: Date
}

// Utility
export interface ImageOpt {
	imageId?: string,
	index: number,
	time: Date,
	parentId: string,
	parentKind: Collection,
	user: string
}

export interface RatingOpt {
	ratingId?: string,
	time: Date,
	parentId: string,
	parentKind: Collection,
	user: string
}

export type EditFor = 'films' | 'companies' | 'people'