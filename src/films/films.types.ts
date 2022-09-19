export interface Still {
	originalName: string;
	description: string;
	url: string;
	quality: string;
	film: string;
}

export interface Poster {
	originalName: string;
	description: string;
	url: string;
	quality: string;
	film: string;
}

export interface Role {
	personName: string;
	title: string;
	subtitle: string;
	category: string;
	characterName?: string;
	characterDescription?: string;
	film: string;
}

export interface Person {
	name: string;
}

export interface Company {
	name: string;
	website?: string;
}

export interface CompanyRole {
	film: string;
	companyName: string;
	year?: string;
	type: string;
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
}