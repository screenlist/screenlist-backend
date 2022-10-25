import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsArray,
	IsNumber
} from 'class-validator';

export class CreateSeriesDto {
	@IsNotEmpty()
	@MaxLength(60)
	name: string;

	@IsString()
	trailerUrl?: string;

	@IsNotEmpty()
	@IsNumber()
	seasons: number;

	@IsNotEmpty()
	@MaxLength(20)
	type: string;

	@IsNotEmpty()
	@IsArray()
	genres: [string];

	@IsNumber()
	episodes?: number;

	@IsNotEmpty()
	@MaxLength(150)
	logline: string;

	@IsNumber()
	episodeRuntime?: number;

	@IsNotEmpty()
	@MaxLength(20)
	productionStage: string;

	@MaxLength(500)
	plotSummary?: string;

	@IsOptional()
	@IsDate()
	releaseDate?: Date;

	@IsOptional()
	@IsDate()
	finalEpisodeDate?: Date;

	@IsOptional()
	@IsString()
	originalPlatform?: string;

	@IsEmpty()
	slug?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateSeriesDto {
	@IsOptional()
	@MaxLength(60)
	name?: string;

	@IsOptional()
	@IsString()
	trailerUrl?: string;

	@IsOptional()
	@IsNumber()
	seasons?: number;

	@IsOptional()
	@MaxLength(20)
	type?: string;

	@IsOptional()
	@IsArray()
	genres?: [string];

	@IsOptional()
	@IsNumber()
	episodes?: number;

	@IsOptional()
	@MaxLength(150)
	logline?: string;

	@IsOptional()
	@IsNumber()
	episodeRuntime?: number;

	@IsOptional()
	@IsString()
	productionStage?: string;

	@IsOptional()
	@MaxLength(500)
	plotSummary?: string;

	@IsOptional()
	@IsDate()
	releaseDate?: Date;

	@IsOptional()
	@IsDate()
	finalEpisodeDate?: Date;

	@IsOptional()
	@IsString()
	originalPlatform?: string;

	@IsEmpty()
	slug?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}