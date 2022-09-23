export class CreateSeriesDto {
	details: {
		name: string;
		nameEditable?: boolean;
		trailerUrl?: string;
		status?: string;
		seasons: number;
		type: string;
		genres: [string];
		episodes: number;
		logline: string;
		episodeRuntime: string;
		productionStage: string;
		plotSummary: string;
		released: Date;
		finalEpisodeDate: Date;
		originalPlatform: string;
		slug?: string;
	}
	currentPlatforms?: [{
		accessType: string;
		url: string;
		platformName: string;
		platformId: number;
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
	companies: [{
		companyName: string;
		companyId?: number;
		website?: string;
		type: string;
		lastUpdated?: Date;
		created?: Date;
		film?: string;
	}];
}