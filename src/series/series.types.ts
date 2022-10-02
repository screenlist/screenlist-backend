import {
	Poster, 
	Still, 
	Link,
	Platform,
} from '../films/films.types';
import {
	Company,
	CompanyRole
} from '../companies/companies.types';
import {
	PersonRole, 
	Person,
} from '../people/people.types';

export interface SeriesDetails {
	id: string;
	name: string;
	nameEditable: boolean;
	trailerUrl?: string;
	status: string;
	seasons: number;
	type?: string;
	genres?: [string];
	episodes?: number;
	logline?: string;
	episodeRuntime?: number;
	productionStage: string;
	plotSummary?: string;
	released?: Date;
	finalEpisodeDate?: Date;
	originalPlatform?: string;
	slug?: string;
	lastUpdated?: Date;
	created?: Date;
}

export interface SeriesType {
	details: SeriesDetails,
	posters?: Poster[],
	stills?: Still[],
	producers?: CompanyRole[],
	platforms?: Link[],
	actors?: PersonRole[],
	crew?: PersonRole[]
}