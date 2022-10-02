export class CreateFilmDto {
	name: string;
	trailerUrl?: string;
	status?: string;
	type: string;
	productionStage: string;
	runtime?: number;
	logline: string;
	plotSummary?: string;
	releaseDate?: Date;
	initialPlatform?: string;
	slug?: string;
	genres?: [string];
	lastUpdated?: Date;
	created?: Date;
}

export class UpdateFilmDto {
	name?: string;
	trailerUrl?: string;
	type?: string;
	productionStage?: string;
	runtime?: number;
	logline?: string;
	plotSummary?: string;
	releaseDate?: Date;
	initialPlatform?: string;
	slug?: string;
	lastUpdated?: Date;
	created?: Date;
}

// Still
export class CreateStillDto {
	url: string;
	description: string;
	originalName: string;
	quality: string;
	lastUpdated?: Date;
	created?: Date;
}

export class UpdateStillDto {
	url: string;
	description?: string;
	originalName?: string;
	quality?: string;
	lastUpdated?: Date;
	created?: Date;
}

// Poster
export class CreatePosterDto {
	url: string;
	originalName: string;
	description: string;
	quality: string;
	lastUpdated?: Date;
	created?: Date;
}

export class UpdatePosterDto {
	url: string;
	originalName?: string;
	description?: string;
	quality?: string;
	lastUpdated?: Date;
	created?: Date;
}