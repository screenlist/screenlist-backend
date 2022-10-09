export interface Person {
	id: string,
	name: string,
	profilePhotoUrl: string,
	profilePhotoOriginalName: string,
	description: string,
	lastUpdated: Date,
	created: Date
}

export interface PersonRole {
	id: string,
	personName: string,
	personId?: string,
	ownerKind: string,
	title: string,
	subtitle: string,
	category: string,
	characterName?: string,
	characterDescription?: string,
	lastUpdated: Date,
	created: Date
}

// Utility
export interface PersonRoleOpt {
	personId: string,
	roleId?: string,
	time: Date,
	parentId: string,
	parentKind: string,
	user: string
}

export interface PersonOpt {
	time: Date,
	user: string,
	personId?: string
}