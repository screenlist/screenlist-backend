export interface Platform {
	id: string,
	name: string,
	profilePhotoUrl: string,
	profilePhotoOriginalName: string,
	description: string,
	website: string,
	created: Date,
	lastUpdated: Date
}

export interface Link {
	id: string,
	accessType: string,
	url: string,
	platformName: string,
	platformId?: string,
	ownerKind: string,
	lastUpdated: Date,
	created: Date
}

// Utility
export interface LinkOpt {
	platformId: string,
	linkId?: string,
	time: Date,
	parentId: string,
	parentKind: string,
	user: string
}

export interface PlatformOpt {
	time: Date,
	user: string,
	platformId?: string
}