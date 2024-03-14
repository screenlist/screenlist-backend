import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsArray,
	IsNumber,
	IsDateString
} from 'class-validator';

export class CreateFilmDto {
	@IsNotEmpty()
	@MaxLength(60)
	name: string;

	@IsNotEmpty()
	@IsNumber()
	year: number;

	@IsOptional()
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

	@IsOptional()
	@IsNumber()
	boxOffice?: number;

	@IsOptional()
	@IsNumber()
	budget?: number;

	@IsNotEmpty()
	@MaxLength(300)
	logline: string;

	@IsOptional()
	@MaxLength(1000)
	plotSummary?: string;

	@IsOptional()
	@IsDateString()
	releaseDate?: Date;

	@IsOptional()
	@IsString()
	initialPlatform?: string;

	@IsNotEmpty()
	@IsArray()
	countries?: [string];

	@IsNotEmpty()
	@IsArray()
	languages?: [string];

	@IsOptional()
	@IsString()
	additionalLanguages?: string;

	@IsNotEmpty()
	@IsArray()
	genres: [string];
}

export class UpdateFilmDto {
	@IsOptional()
	@IsNotEmpty()
	@MaxLength(60)
	name?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsNumber()
	year?: number;

	@IsOptional()
	@IsString()
	trailerUrl?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(20)
	type?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(20)
	format?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(20)
	productionStage?: string;

	@IsOptional()
	@IsNumber()
	runtime?: number;

	@IsOptional()
	@IsNumber()
	boxOffice?: number;

	@IsOptional()
	@IsNumber()
	budget?: number;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(300)
	logline?: string;

	@IsOptional()
	@MaxLength(1000)
	plotSummary?: string;

	@IsOptional()
	@IsDateString()
	releaseDate?: Date;

	@IsOptional()
	@IsString()
	initialPlatform?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsArray()
	countries?: [string];

	@IsOptional()
	@IsNotEmpty()
	@IsArray()
	languages?: [string];

	@IsOptional()
	@IsString()
	additionalLanguages?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsArray()
	genres?: [string];
}

export class PhotoDto {
	@IsNotEmpty()
	@IsString()
	attribution: string;

	@IsNotEmpty()
	@IsString()
	description: string;

	@IsNotEmpty()
	@IsString()
	source: string | 'direct';
}

// Ratings
export class CreateListRatingDto {
	@IsOptional()
	@IsEmpty()
	@IsString()
	author: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	authorUid: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	parentId: string;	

	@IsOptional()
	@IsEmpty()
	@IsString()
	parentKind: string;

	@IsNotEmpty()
	@MaxLength(250)
	verdict: string;

	@IsNotEmpty()
	@MaxLength(1)
	listRating: string;

	@IsNotEmpty()
	@IsString()
	reviewLink: string;
}

export class UpdateListRatingDto {
	@IsOptional()
	@IsNotEmpty()
	@MaxLength(250)
	verdict?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(1)
	listRating?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	reviewLink?: string;
}