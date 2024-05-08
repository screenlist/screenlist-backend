export interface FilmSchema {
	id: string;
	name: string;
	year: number;
	directors?: string[];
	genres: string[];
	type: string;
	format: string;
	productionStage: string;
	releaseDate?: number;
	listRatings: number;
	listScore: number;
	posterUrl?: string;
	logline: string;
	initialPlatform?: string;
	created: number;
	lastUpdated: number;
}

export interface CompanySchema {
	id: string;
	name: string;
	description?: string;
	created: number;
	lastUpdated: number;
	founded?: number;
	country?: string;
	director?: string;
	founder?: string;
	city?: string;
	photoUrl?: string
}

export interface PersonSchema {
	id: string;
	name: string;
	description?: string;
	occupation: string;
	yearOfBirth?: number;
	cityOfOrigin?: string;
	nationality?: string[];
	gender?: string;
	pronouns?: string;
	provinceOfOrigin?: string;
	countryOfOrigin?: string;
	deathDate?: number;
	dateMonthOfBirth?: number;
	created: number;
	lastUpdated: number;
	photoUrl?: string;
}

export interface UserSchema {
	id: string;
	username: string;
	fullName: string;
	role: string;
	reputation: number;
	publication?: string;
	criticScore?: number;
	created: number;
	lastUpdated: number;
	photoUrl?: string;
}

export interface ContentSchema {
	id: string;
	authorName: string;
	authorId: string;
	headline?: string;
	summary?: string;
	slug: string;
	created: number;
	lastUpdated: number;
	photoUrl?: string;
}