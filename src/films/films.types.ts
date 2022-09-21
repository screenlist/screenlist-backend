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
	personName: string;
	title: string;
	subtitle: string;
	category: string;
	characterName?: string;
	characterDescription?: string;
	film: string;
	lastUpdated: Date;
	created: Date;
}

export interface Person {
	name: string;
	lastUpdated: Date;
	created: Date;
}

export interface Company {
	name: string;
	website?: string;
	lastUpdated: Date;
	created: Date;
}

export interface CompanyRole {
	film: string;
	companyName: string;
	year?: string;
	type: string;
	website?: string;
	lastUpdated: Date;
	created: Date;
}

export interface Platform {
	name: string;
	website?: string;
	lastUpdated: Date;
	created: Date;
}

export interface Link {
	accessType: string;
	url: string;
	platformName: string;
	film: string;
	lastUpdated: Date;
	created: Date;
}

export interface FilmDetails {
	name: string;
	trailerUrl?: string;
	type: string;
	productionStage: string;
	runtime?: number;
	logline: string;
	plotSummary?: string;
	releaseDate?: Date;
	initialPlatform?: string;
	slug: string;
	lastUpdated: Date;
	created: Date;
}