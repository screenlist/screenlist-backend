import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto
} from '../companies/companies.dto';

export class CreateFilmDto {
	details: {
		name: string;
		nameEditable?: boolean;
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
	};
	posters?: CreatePosterDto[];
	currentPlatforms?: CreateLinkDto[];
	companies: CreateCompanyRoleDto[];
	stillFrames?: CreateStillDto[];
	credits: CreatePersonRoleDto[]
}

export class UpdateFilmDto {
	details: {
		id: string;
		name?: string;
		nameEditable?: boolean;
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
	};
	posters?: UpdatePosterDto[];
	currentPlatforms?: UpdateLinkDto[];
	companies?: UpdateCompanyRoleDto[];
	stillFrames?: UpdateStillDto[];
	credits?: UpdatePersonRoleDto[]
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

// PersonRole
export class CreatePersonRoleDto {
	personName: string;
	personId?: number;
	ownerKind?: string;
	ownerId: string;
	title: string;
	subtitle: string;
	category: string;
	characterName?: string;
	characterDescription?: string;
	lastUpdated?: Date;
	created?: Date;
}

export class UpdatePersonRoleDto {
	id: number;
	personName?: string;
	personId?: number;
	title?: string;
	subtitle?: string;
	category?: string;
	characterName?: string;
	characterDescription?: string;
	lastUpdated?: Date;
	created?: Date;
}

// Link
export class CreateLinkDto {
	accessType: string;
	url: string;
	platformName: string;
	platformId?: number;
	ownerKind: string;
	ownerId: string;
	lastUpdated?: Date;
	created?: Date;
}

export class UpdateLinkDto {
	id: number;
	accessType?: string;
	url?: string;
	platformName?: string;
	platformId?: number;
	lastUpdated?: Date;
	created?: Date;
}