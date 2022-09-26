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
		platformId?: number;
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
		id: number;
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
	posters?: [{
		url: string;
		originalName?: string;
		description?: string;
		quality?: string;
		lastUpdated?: Date;
		created?: Date;
	}];
	currentPlatforms?: [{
		id: number;
		accessType?: string;
		url?: string;
		platformName?: string;
		platformId?: number;
		lastUpdated?: Date;
		created?: Date;
	}];
	companies?: [{
		id: number;
		companyName?: string;
		companyId?: number;
		website?: string;
		type?: string;
		lastUpdated?: Date;
		created?: Date;
		film?: string;
	}];
	stillFrames?: [{
		url: string;
		description?: string;
		originalName?: string;
		quality?: string;
		lastUpdated?: Date;
		created?: Date;
	}];
	credits?: [{
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
		film?: string;
	}]
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
		film: string;
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
		film: string;
		lastUpdated: Date;
		created: Date;
	}]
}