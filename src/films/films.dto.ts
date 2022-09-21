export class CreateFilmDto {
	details: {
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
		lastUpdated?: Date;
		created?: Date;
	};
	posters?: [{
		url: string;
		originalName: string;
		description: string;
		quality: string;
		lastUpdated?: Date;
		created?: Date;
	}];
	currentPlatforms?: [{
		accessType: string;
		url: string;
		platformName: string;
		platformId: number;
		lastUpdated?: Date;
		created?: Date;
	}];
	companies: [{
		companyName: string;
		companyId?: number;
		website?: string;
		type: string;
		lastUpdated?: Date;
		created?: Date;
		film?: string;
	}];
	stillFrames?: [{
		url: string;
		description: string;
		originalName: string;
		quality: string;
		lastUpdated?: Date;
		created?: Date;
	}];
	credits: [{
		personName: string;
		personId?: number;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
		lastUpdated?: Date;
		created?: Date;
		film?: string;
	}]
}

export class UpdateFilmDto {
	details: {
		name: string;
		posterUrl?: string;
		trailerUrl?: string;
		type?: string;
		productionStage?: string;
		runtime?: number;
		logline?: string;
		plotSummary?: string;
		releaseDate?: Date;
		initialPlatform?: string;
	};
	currentPlatforms?: [{
		accessType: string;
		url: string;
		name: string;
	}];
	productionCompanies?: [{
		name: string
	}];
	distributionCompanies?: [{
		name: string
	}];
	stillFrames?: [{
		fileName: string;
		url: string;
		description: string;
	}];
	credits?: [{
		name: string;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
	}]
}

export class GetFilmDto {
	details: {
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
		accessType: string;
		url: string;
		platformName: string;
		film: string;
		lastUpdated: Date;
		created: Date;
	}];
	productionCompanies?: [{
		name: string;
		website?: string;
		film: string;
	}];
	distributionCompanies?: [{
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
		name: string;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
		film: string;
		lastUpdated: Date;
		created: Date;
	}];
	crew?: [{
		name: string;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
		film: string;
		lastUpdated: Date;
		created: Date;
	}]
}