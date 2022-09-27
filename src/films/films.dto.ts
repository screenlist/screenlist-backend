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

export class GetFilmDto {
	details: {
		id: number;
		name: string;
		trailerUrl?: string;
		type: string;
		productionStage: string;
		runtime?: number;
		logline: string;
		plotSummary?: string;
		releaseDate?: Date;
		initialPlatform?: string;
		slug?: string;
		lastUpdated: Date;
		created: Date;
	};
	posters?: [{
		originalName: string;
		description: string;
		url: string;
		quality: string;
		film: string;
		lastUpdated: Date;
		created: Date;
	}];
	currentPlatforms?: [{
		id: number;
		accessType: string;
		url: string;
		platformName: string;
		film: string;
		lastUpdated: Date;
		created: Date;
	}];
	productionCompanies?: [{
		id: number;
		name: string;
		website?: string;
		film: string;
	}];
	distributionCompanies?: [{
		id: number;
		name: string;
		website?: string;
		film: string;
	}];
	stillFrames?: [{
		originalName: string;
		description: string;
		url: string;
		quality: string;
		film: string;
		lastUpdated: Date;
		created: Date;
	}];
	actors?: [{
		id: number;
		name: string;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
		lastUpdated: Date;
		created: Date;
	}];
	crew?: [{
		id: number;
		name: string;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
		lastUpdated: Date;
		created: Date;
	}]
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

// CompanyRole
export class CreateCompanyRoleDto {
	companyName: string;
	companyId?: number;
	website?: string;
	type: string;
	lastUpdated?: Date;
	created?: Date;
	film?: string;
}

export class UpdateCompanyRoleDto {
	id: number;
	companyName?: string;
	companyId?: number;
	website?: string;
	type?: string;
	lastUpdated?: Date;
	created?: Date;
	film?: string;
}

// Link
export class CreateLinkDto {
	accessType: string;
	url: string;
	platformName: string;
	platformId?: number;
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