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
	genres?: [string];

	@IsOptional()
	@IsEmpty()
	hasPoster?: boolean;

	@IsOptional()
	@IsEmpty()
	isHidden?: boolean;

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

	@IsOptional()
	@IsEmpty()
	editLocked?: boolean;

	@IsOptional()
	@IsEmpty()
	@IsDate()
	lastVerified?: Date;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
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
	genres?: [string];

	@IsOptional()
	@IsEmpty()
	@IsNumber()
	listScore?: number;

	@IsOptional()
	@IsEmpty()
	@IsNumber()
	listRatings?: number;

	@IsOptional()
	@IsEmpty()
	hasPoster?: boolean;

	@IsOptional()
	@IsEmpty()
	isHidden?: boolean;

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

	@IsOptional()
	@IsEmpty()
	editLocked?: boolean;

	@IsOptional()
	@IsEmpty()
	@IsDate()
	lastVerified?: Date;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}

// Still
export class CreateStillDto {

	@IsOptional()	
	@IsEmpty()
	stillIndex?: string;

	@IsOptional()
	@IsEmpty()
	parentId?: string;

	@IsOptional()
	@IsEmpty()
	parentKind?: string;

	@IsOptional()	
	@IsEmpty()
	originalUrl?: string;

	@IsOptional()
	@IsEmpty()
	originalName?: string;

	@IsOptional()
	@IsEmpty()
	originalDimensions?: string;

	@IsOptional()
	@IsEmpty()
	originalSize?: number;

	@IsOptional()
	@IsEmpty()
	hdUrl?: string;

	@IsOptional()
	@IsEmpty()
	hdName?: string;

	@IsOptional()
	@IsEmpty()
	hdDimensions?: string;

	@IsOptional()
	@IsEmpty()
	hdSize?: number;

	@IsOptional()
	@IsEmpty()
	sdUrl?: string;

	@IsOptional()
	@IsEmpty()
	sdName?: string;

	@IsOptional()
	@IsEmpty()
	sdDinemsions?: string;

	@IsOptional()
	@IsEmpty()
	sdSize?: number

	@IsOptional()
	@IsEmpty()
	lqUrl?: string;

	@IsOptional()
	@IsEmpty()
	lqName?: string;

	@IsOptional()
	@IsEmpty()
	lqDinemsions?: string;

	@IsOptional()
	@IsEmpty()
	lqSize?: number;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateStillDto {
	@IsOptional()
	@IsNotEmpty()
	@MaxLength(30)
	attribution?: string;

	@IsOptional()
	@IsNotEmpty()
	@MaxLength(150)
	description?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(10)
	source?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	sourceLink?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}

// Poster
export class CreatePosterDto {
	@IsOptional()	
	@IsEmpty()
	posterIndex?: string;

	@IsOptional()
	@IsEmpty()
	parentId?: string;

	@IsOptional()
	@IsEmpty()
	parentKind?: string;

	@IsOptional()	
	@IsEmpty()
	originalUrl?: string;

	@IsOptional()
	@IsEmpty()
	originalName?: string;

	@IsOptional()
	@IsEmpty()
	originalDimensions?: string;

	@IsOptional()
	@IsEmpty()
	originalSize?: number;

	@IsOptional()
	@IsEmpty()
	hdUrl?: string;

	@IsOptional()
	@IsEmpty()
	hdName?: string;

	@IsOptional()
	@IsEmpty()
	hdDimensions?: string;

	@IsOptional()
	@IsEmpty()
	hdSize?: number;

	@IsOptional()
	@IsEmpty()
	sdUrl?: string;

	@IsOptional()
	@IsEmpty()
	sdName?: string;

	@IsOptional()
	@IsEmpty()
	sdDinemsions?: string;

	@IsOptional()
	@IsEmpty()
	sdSize?: number

	@IsOptional()
	@IsEmpty()
	lqUrl?: string;

	@IsOptional()
	@IsEmpty()
	lqName?: string;

	@IsOptional()
	@IsEmpty()
	lqDinemsions?: string;

	@IsOptional()
	@IsEmpty()
	lqSize?: number;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdatePosterDto {
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(30)
	attribution?: string;	

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(150)
	description?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(10)
	source?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	sourceLink?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}

// Display Photos
export class CreateDisplayPhotoDto {
	@IsOptional()	
	@IsEmpty()
	photoIndex?: string;

	@IsOptional()
	@IsEmpty()
	parentId?: string;

	@IsOptional()	
	@IsEmpty()
	originalUrl?: string;

	@IsOptional()
	@IsEmpty()
	originalName?: string;

	@IsOptional()
	@IsEmpty()
	originalDimensions?: string;

	@IsOptional()
	@IsEmpty()
	originalSize?: number;

	@IsOptional()
	@IsEmpty()
	hdUrl?: string;

	@IsOptional()
	@IsEmpty()
	hdName?: string;

	@IsOptional()
	@IsEmpty()
	hdDimensions?: string;

	@IsOptional()
	@IsEmpty()
	hdSize?: number;

	@IsOptional()
	@IsEmpty()
	sdUrl?: string;

	@IsOptional()
	@IsEmpty()
	sdName?: string;

	@IsOptional()
	@IsEmpty()
	sdDinemsions?: string;

	@IsOptional()
	@IsEmpty()
	sdSize?: number

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateDisplayPhotoDto {
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(30)
	attribution?: string;	

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(150)
	description?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(10)
	source?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	sourceLink?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}

// Content Photos
export class CreateContentPhotoDto {
	@IsOptional()	
	@IsEmpty()
	photoIndex?: string;

	@IsOptional()
	@IsEmpty()
	parentId?: string;

	@IsOptional()	
	@IsEmpty()
	originalUrl?: string;

	@IsOptional()
	@IsEmpty()
	originalName?: string;

	@IsOptional()
	@IsEmpty()
	originalDimensions?: string;

	@IsOptional()
	@IsEmpty()
	originalSize?: number;

	@IsOptional()
	@IsEmpty()
	hdUrl?: string;

	@IsOptional()
	@IsEmpty()
	hdName?: string;

	@IsOptional()
	@IsEmpty()
	hdDimensions?: string;

	@IsOptional()
	@IsEmpty()
	hdSize?: number;

	@IsOptional()
	@IsEmpty()
	sdUrl?: string;

	@IsOptional()
	@IsEmpty()
	sdName?: string;

	@IsOptional()
	@IsEmpty()
	sdDinemsions?: string;

	@IsOptional()
	@IsEmpty()
	sdSize?: number

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;

	@IsOptional()
	@IsDate()
	created?: Date;
}

export class UpdateContentPhotoDto {
	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(30)
	attribution?: string;	

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(150)
	description?: string;	

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	@MaxLength(10)
	source?: string;

	@IsOptional()
	@IsNotEmpty()
	@IsString()
	sourceLink?: string;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
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

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

	@IsOptional()
	@IsDate()
	lastUpdated: Date;

	@IsOptional()
	@IsDate()
	created: Date;
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

	@IsOptional()
	@IsEmpty()
	editVerified?: boolean;

	@IsOptional()
	@IsDate()
	lastUpdated?: Date;
}