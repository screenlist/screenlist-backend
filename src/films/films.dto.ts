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

export class CreateFilmDto {
	@IsNotEmpty()
	@MaxLength(60)
	name: string;

	@IsString()
	trailerUrl?: string;

	@IsNotEmpty()
	@MaxLength(20)
	type: string;

	@IsNotEmpty()
	@MaxLength(20)
	format: string;

	@IsNotEmpty()
	@MaxLength(20)
	productionStage: string;

	@IsOptional()
	@IsNumber()
	runtime?: number;

	@IsNotEmpty()
	@MaxLength(150)
	logline: string;

	@IsOptional()
	@MaxLength(500)
	plotSummary?: string;

	@IsOptional()
	@IsDate()
	releaseDate?: Date;

	@IsString()
	initialPlatform?: string;

	@IsOptional()
	@IsEmpty()
	slug?: string;

	@IsNotEmpty()
	@IsArray()
	genres?: [string];

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateFilmDto {
	@IsOptional()
	@MaxLength(60)
	name?: string;

	@IsOptional()
	@IsString()
	trailerUrl?: string;

	@IsOptional()
	@MaxLength(20)
	type?: string;

	@IsNotEmpty()
	@MaxLength(20)
	format?: string;

	@IsOptional()
	@MaxLength(20)
	productionStage?: string;

	@IsOptional()
	@IsNumber()
	runtime?: number;

	@IsOptional()
	@MaxLength(150)
	logline?: string;

	@IsOptional()
	@MaxLength(500)
	plotSummary?: string;

	@IsOptional()
	@IsDate()
	releaseDate?: Date;

	@IsOptional()
	@IsString()
	initialPlatform?: string;

	@IsOptional()
	@IsEmpty()
	slug?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

// Still
export class CreateStillDto {
	@IsEmpty()
	url?: string;

	@IsEmpty()
	originalName: string;

	@IsEmpty()
	quality?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateStillDto {
	@IsNotEmpty()
	@MaxLength(30)
	description?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}

// Poster
export class CreatePosterDto {
	@IsEmpty()
	url?: string;

	@IsEmpty()
	originalName: string;

	@IsEmpty()
	quality?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdatePosterDto {
	@IsNotEmpty()
	@MaxLength(30)
	description?: string;	

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}