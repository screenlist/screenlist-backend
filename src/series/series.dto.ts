export class CreateSeriesDto {
	name: string;
	trailerUrl?: string;
	status?: string;
	seasons: number;
	type: string;
	genres: [string];
	episodes?: number;
	logline: string;
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

export class UpdateSeriesDto {
	name?: string;
	trailerUrl?: string;
	status?: string;
	seasons?: number;
	type?: string;
	genres?: [string];
	episodes?: number;
	logline?: string;
	episodeRuntime?: number;
	productionStage?: string;
	plotSummary?: string;
	released?: Date;
	finalEpisodeDate?: Date;
	originalPlatform?: string;
	slug?: string;
	lastUpdated?: Date;
	created?: Date;
}