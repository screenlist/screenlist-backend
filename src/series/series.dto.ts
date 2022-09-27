import {
	CreateLinkDto,
	UpdateLinkDto,
	CreatePersonRoleDto,
	UpdatePersonRoleDto,
	CreateStillDto,
	UpdateStillDto,
	CreatePosterDto,
	UpdatePosterDto,
} from '../films/films.dto';
import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto
} from '../companies/companies.dto';

export class CreateSeriesDto {
	details: {
		name: string;
		nameEditable?: boolean;
		trailerUrl?: string;
		status?: string;
		seasons: number;
		type: string;
		genres: [string];
		episodes?: number;
		logline: string;
		episodeRuntime?: number;
		productionStage: string;
		plotSummary?: string;
		released?: Date;
		finalEpisodeDate?: Date;
		originalPlatform?: string;
		slug?: string;
		lastUpdated?: Date;
		created?: Date;
	}
	posters?: CreateStillDto[];
	stillFrames?: CreateStillDto[];
	currentPlatforms?: CreateLinkDto[];
	credits: CreatePersonRoleDto[]
	companies: CreateCompanyRoleDto[];
}

export class UpdateSeriesDto {
	details: {
		id: string;
		name?: string;
		nameEditable?: boolean;
		trailerUrl?: string;
		status?: string;
		seasons?: number;
		type?: string;
		genres?: [string];
		episodes?: number;
		logline?: string;
		episodeRuntime?: number;
		productionStage?: string;
		plotSummary?: string;
		released?: Date;
		finalEpisodeDate?: Date;
		originalPlatform?: string;
		slug?: string;
		lastUpdated?: Date;
		created?: Date;
	}
	posters?: UpdatePosterDto[];
	stillFrames?: UpdateStillDto[];
	currentPlatforms?: UpdateLinkDto[];
	credits?: UpdatePersonRoleDto[];
	companies?: UpdateCompanyRoleDto[];
}