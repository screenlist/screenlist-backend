import { Collection } from "src/database/database.types";

export interface Person {
	id: string;
	name: string;
	occupation: string;
	cityOfOrigin?: string;
	provinceOfOrigin?: string;
	countryOfOrigin?: string;
	yearOfBirth?: number;
	dateMonthOfBirth?: Date;
	deathDate?: Date;
	nationality?: string[];
	gender?: string;
	pronouns?: string;
	twitterUsername?: string;
	instagramUsername?: string;
	description?: string;
	website?: string;
	editVerified: boolean;
	isHidden: boolean;
	editLocked: boolean;
	lastVerified: Date;
	created: Date;
	lastUpdated: Date;
}

// Utility
export interface PersonRoleOpt {
	personId: string,
	roleId?: string,
	time: Date,
	parentId: string,
	parentKind: Collection,
	user: string
}

export interface PersonOpt {
	time: Date,
	user: string,
	personId?: string
}