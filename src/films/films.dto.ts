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
	};
	posters?: [{
		originalName: string;
		description: string;
		url: string;
		quality: string;
		film: string;
	}];
	currentPlatforms?: [{
		accessType: string;
		url: string;
		name: string;
		film: string;
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
	}];
	credits?: [{
		name: string;
		title: string;
		subtitle: string;
		category: string;
		characterName?: string;
		characterDescription?: string;
		film: string;
	}]
}

export class StillDto {
	originalName: string;
	description: string;
	url: string;
	quality: string;
}

export class PosterDto {
	originalName: string;
	description: string;
	url: string;
	quality: string;
}

export class Role {
	name: string;
	title: string;
	subtitle: string;
	category: string;
	characterName?: string;
	characterDescription?: string;
}

export class Person {
	name: string;
}

export class Company {
	name: string;
	website?: string;
}