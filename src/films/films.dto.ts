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
		slug: string;
	};
	posters?: [{
		url: string;
		originalName: string;
		description: string;
		quality: string;
	}];
	currentPlatforms?: [{
		accessType: string;
		url: string;
		name: string;
	}];
	productionCompanies: [{
		name: string;
		website?: string;
	}];
	distributionCompanies?: [{
		name: string;
		website?: string;
	}];
	stillFrames?: [{
		url: string;
		description: string;
		originalName: string;
		quality: string;
	}];
	credits: [{
		name: string;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
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