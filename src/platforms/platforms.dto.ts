export class CreatePlatformDto {
	name: string;
	profilePhotoUrl: string;
	profilePhotoOriginalName: string;
	description: string;
	website: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdatePlatformDto {
	name?: string;
	profilePhotoUrl?: string;
	profilePhotoOriginalName?: string;
	description?: string;
	website?: string;
	created?: Date;
	lastUpdated?: Date;
}

export class CreateLinkDto {
	accessType: string;
	url: string;
	platformName: string;
	platformId: number;
	ownerKind: string;
	ownerId: string;
	lastUpdated?: Date;
	created?: Date;
}

export class UpdateLinkDto {
	accessType?: string;
	url?: string;
	lastUpdated?: Date;
	created?: Date;
}