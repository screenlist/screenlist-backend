export class CreatePersonDto {
	name: string;
	profilePhotoUrl: string;
	profilePhotoOriginalName: string;
	website: string;
	created: Date;
	lastUpdated: Date;
}

export class UpdatePersonDto {
	name?: string;
	profilePhotoUrl?: string;
	profilePhotoOriginalName?: string;
	website?: string;
	created?: Date;
	lastUpdated?: Date;
}

export class CreatePersonRoleDto {
	personName: string;
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
	personName?: string;
	title?: string;
	subtitle?: string;
	category?: string;
	characterName?: string;
	characterDescription?: string;
	lastUpdated?: Date;
	created?: Date;
}